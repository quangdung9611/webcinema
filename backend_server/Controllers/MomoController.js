const axios = require('axios');
const crypto = require('crypto');
const db = require('../Config/db');
// FIX: Import trực tiếp hàm gửi mail
const { sendTicketEmail } = require('./BankAppController'); 

const MomoController = {
    // 1. TẠO GIAO DỊCH (Giữ nguyên logic MoMo của ông)
    createPayment: async (req, res) => {
        try {
            const { bookingId, amount } = req.body;
            const partnerCode = 'MOMOBKUN20180810';
            const accessKey = 'klm05ndA99cl4UXT';
            const secretKey = 'f06nd13v6u1234567890abcdefghijk';
            const requestId = partnerCode + new Date().getTime();
            const orderId = bookingId;
            const orderInfo = `Thanh toán vé Dũng Cinema #${bookingId}`;
            const redirectUrl = "http://localhost:5173/confirm-success"; 
            const ipnUrl = "https://your-ngrok-link.ngrok-free.app/api/momo/callback"; 
            const requestType = "payWithMethod";
            const extraData = ""; 

            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const requestBody = {
                partnerCode, accessKey, requestId, amount, orderId, 
                orderInfo, redirectUrl, ipnUrl, extraData, 
                requestType, signature, lang: 'vi'
            };

            const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody);
            res.json(response.data); 
        } catch (error) {
            console.error("Lỗi MoMo Create:", error.message);
            res.status(500).json({ message: "Không thể tạo giao dịch MoMo" });
        }
    },

    // 2. XÁC NHẬN THANH TOÁN & GỬI EMAIL (Đã đồng bộ logic BankApp)
    confirmMomoFast: async (req, res) => {
        const { bookingId } = req.body;
        console.log(`>>> [DŨNG CINEMA] Đang xử lý chốt đơn MoMo #${bookingId}...`);

        const connection = await db.getConnection();
        try {
            const [check] = await connection.query("SELECT status FROM bookings WHERE booking_id = ?", [bookingId]);
            if (check[0] && check[0].status === 'Completed') {
                return res.json({ success: true, message: "Đơn hàng đã được xử lý trước đó." });
            }

            await connection.beginTransaction();

            // --- BƯỚC 1: CẬP NHẬT TRẠNG THÁI ---
            await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);

            // --- BƯỚC 2: CHỐT GHẾ ---
            await connection.execute(
                `UPDATE tickets 
                 SET seat_status = 'Booked', 
                     ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                     updated_at = NOW()
                 WHERE booking_id = ? AND seat_status = 'Reserved'`, 
                [bookingId]
            );

            // --- BƯỚC 3: LẤY DỮ LIỆU TỔNG HỢP (Đồng bộ với BankApp) ---
            const [orderRows] = await connection.query(`
                SELECT 
                    b.booking_id, 
                    u.full_name, 
                    u.email,
                    m.title AS movieTitle, 
                    m.poster_url AS moviePoster, 
                    c.cinema_name AS cinemaName,
                    r.room_name AS roomName,
                    s.start_time,
                    GROUP_CONCAT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.item_name END SEPARATOR ', ') AS seatLabel
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                JOIN cinemas c ON s.cinema_id = c.cinema_id
                JOIN rooms r ON s.room_id = r.room_id
                JOIN booking_details bd ON b.booking_id = bd.booking_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id`, [bookingId]);

            if (orderRows.length === 0) throw new Error("Không tìm thấy đơn hàng");
            const order = orderRows[0];

            // Lấy chi tiết đồ ăn
            const [foodRows] = await connection.query(
                "SELECT item_name, quantity FROM booking_details WHERE booking_id = ? AND product_id IS NOT NULL", 
                [bookingId]
            );

            const foodLabelForEmail = foodRows
                .map(d => `${d.item_name} (x${d.quantity})`)
                .join(', ');

            const fullDate = new Date(order.start_time);
            const formattedTime = fullDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const formattedDate = fullDate.toLocaleDateString('vi-VN');

            const ticketData = {
                bookingId: order.booking_id,
                customerName: order.full_name,
                movieTitle: order.movieTitle,
                moviePoster: order.moviePoster,
                cinemaName: order.cinemaName,
                roomName: order.roomName,
                startTime: formattedTime,
                selectedDate: formattedDate,
                seatLabel: order.seatLabel, // Chuỗi "B1, B2" từ SQL
                selectedFoods: foodLabelForEmail || 'Không có'
            };

            // --- BƯỚC 4: GỬI VÉ QUA EMAIL ---
            await sendTicketEmail(order.email, ticketData);

            await connection.commit();

            // --- BƯỚC 5: TRẢ DỮ LIỆU ĐỂ FRONTEND HIỂN THỊ ---
            res.json({ 
                success: true, 
                message: "Thanh toán MoMo hoàn tất!",
                data: {
                    orderId: order.booking_id,
                    customerName: order.full_name,
                    customerEmail: order.email,
                    movieTitle: order.movieTitle,
                    moviePoster: order.moviePoster,
                    cinemaName: order.cinemaName,
                    roomName: order.roomName,
                    seatDisplay: order.seatLabel,
                    startTime: formattedTime,
                    selectedDate: formattedDate,
                    selectedFoods: foodRows, // Trả về mảng để React map()
                    ticketPIN: Math.floor(1000 + Math.random() * 9000)
                }
            });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("❌ Lỗi MoMo Callback:", error.message);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    callback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) console.log(`>>> MoMo IPN: Đơn #${orderId} đã thanh toán.`);
        return res.status(204).send(); 
    }
};

module.exports = MomoController;
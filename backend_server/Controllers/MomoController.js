const axios = require('axios');
const crypto = require('crypto');
const db = require('../Config/db');
const { sendTicketEmail } = require('./BankAppController'); 

const MomoController = {
    // 1. TẠO GIAO DỊCH
    createPayment: async (req, res) => {
        try {
            const { bookingId, amount } = req.body;
            const partnerCode = 'MOMOBKUN20180810';
            const accessKey = 'klm05ndA99cl4UXT';
            const secretKey = 'f06nd13v6u1234567890abcdefghijk';
            const requestId = partnerCode + new Date().getTime();
            const orderId = bookingId;
            const orderInfo = `Thanh toán vé Cinema Star #${bookingId}`;
            
            // Cập nhật link Frontend của Dũng
            const redirectUrl = "https://quangdungcinema.id.vn/confirm-success"; 
            
            // Cập nhật link Render của Dũng (Không dùng Ngrok nữa)
            const ipnUrl = "https://webcinema-zb8z.onrender.com/api/momo/callback"; 

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
            console.error("❌ [DŨNG] Lỗi MoMo Create:", error.message);
            res.status(500).json({ message: "Không thể tạo giao dịch MoMo" });
        }
    },

    // 2. XÁC NHẬN THANH TOÁN (Chốt đơn sau khi khách trả tiền)
    confirmMomoFast: async (req, res) => {
        const { bookingId } = req.body;
        console.log(`>>> 🍿 [DŨNG CINEMA] Đang chốt đơn MoMo #${bookingId}...`);

        const connection = await db.getConnection();
        try {
            const [check] = await connection.query("SELECT status, user_id FROM bookings WHERE booking_id = ?", [bookingId]);
            if (check[0] && check[0].status === 'Completed') {
                return res.json({ success: true, message: "Đơn hàng đã hoàn tất trước đó." });
            }

            await connection.beginTransaction();
            
            // --- FIX GIỜ VIỆT NAM TẠI ĐÂY ---
            const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

            // 1. Cập nhật trạng thái đơn hàng
            await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);

            // 2. Chốt ghế & Cập nhật thời gian chốt đơn (updated_at) bằng giờ VN
            await connection.execute(
                `UPDATE tickets t
                 JOIN showtimes s ON t.showtime_id = s.showtime_id
                 SET t.seat_status = 'Booked', 
                     t.ticket_code = REPLACE(t.ticket_code, 'WAIT-', 'TIC-'),
                     t.cinema_id = s.cinema_id,
                     t.room_id = s.room_id,
                     t.updated_at = ?
                 WHERE t.booking_id = ? AND t.seat_status = 'Reserved'`, 
                [nowVN, bookingId]
            );

            // 3. Lấy dữ liệu tổng hợp để gửi mail
            const [orderRows] = await connection.query(`
                SELECT 
                    b.booking_id, b.user_id,
                    u.full_name, u.email,
                    m.title AS movieTitle, 
                    m.poster_url AS moviePoster, 
                    c.cinema_name AS cinemaName,
                    r.room_name AS roomName,
                    DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time_raw,
                    GROUP_CONCAT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.item_name END SEPARATOR ', ') AS seatLabel
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                JOIN cinemas c ON s.cinema_id = c.cinema_id
                JOIN rooms r ON s.room_id = r.room_id
                LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id`, [bookingId]);

            if (orderRows.length === 0) throw new Error("Không tìm thấy đơn hàng");
            const order = orderRows[0];

            // 4. Logic cộng điểm thưởng
            const [details] = await connection.execute(
                `SELECT bd.price, bd.quantity, s.seat_type 
                 FROM booking_details bd
                 LEFT JOIN seats s ON bd.seat_id = s.seat_id
                 WHERE bd.booking_id = ?`,
                [bookingId]
            );

            let totalEarnedPoints = 0;
            details.forEach(item => {
                const itemTotal = Number(item.price) * Number(item.quantity);
                if (item.seat_id) {
                    const type = String(item.seat_type || 'NORMAL').toUpperCase();
                    let rate = (type === 'VIP') ? 0.10 : (['DOUBLE', 'SWEETBOX', 'COUPLE'].includes(type)) ? 0.07 : 0.05;
                    totalEarnedPoints += Math.floor(itemTotal * rate);
                } else {
                    totalEarnedPoints += Math.floor(itemTotal * 0.03);
                }
            });

            if (totalEarnedPoints > 0) {
                await connection.execute(
                    `UPDATE users SET points = points + ? WHERE user_id = ?`,
                    [totalEarnedPoints, order.user_id]
                );
                console.log(`✨ [DŨNG] MoMo thành công: Cộng ${totalEarnedPoints} điểm cho User #${order.user_id}`);
            }

            // 5. Format lại thời gian chiếu phim từ database
            const [datePart, timePart] = order.start_time_raw.split(' ');
            const [y, m, d] = datePart.split('-');
            const [hh, mm] = timePart.split(':');

            const formattedTime = `${hh}:${mm}`;
            const formattedDate = `${d}/${m}/${y}`;

            // Lấy danh sách bắp nước cho Mail
            const [foodRows] = await connection.query(
                "SELECT item_name, quantity FROM booking_details WHERE booking_id = ? AND seat_id IS NULL", 
                [bookingId]
            );
            const foodString = foodRows.map(f => `${f.item_name} (x${f.quantity})`).join(', ') || 'Không có';

            // Gửi mail xác nhận
            await sendTicketEmail(order.email, {
                ...order,
                startTime: formattedTime,
                selectedDate: formattedDate,
                selectedFoods: foodString
            });

            await connection.commit();

            // 6. Trả kết quả về Frontend
            res.json({ 
                success: true, 
                message: "Thanh toán MoMo hoàn tất!",
                data: {
                    bookingId: order.booking_id,
                    movieTitle: order.movieTitle,
                    cinemaName: order.cinemaName,
                    startTime: formattedTime,
                    selectedDate: formattedDate,
                    seatLabel: order.seatLabel,
                    ticketPIN: Math.floor(1000 + Math.random() * 9000)
                }
            });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("❌ [DŨNG] Lỗi MoMo Callback:", error.message);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    callback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) console.log(`>>> [DŨNG] MoMo IPN: Đơn #${orderId} thanh toán OK.`);
        return res.status(204).send(); 
    }
};

module.exports = MomoController;
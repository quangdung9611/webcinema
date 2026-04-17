const axios = require('axios');
const crypto = require('crypto');
const db = require('../Config/db');
const mailService = require('../services/MailServiceTicket'); // Import đúng service Dũng cần

/**
 * HÀM XỬ LÝ LÕI: Chốt đơn, Đổi trạng thái ghế, Cộng điểm và Gửi Mail
 */
const internalUpdateBooking = async (bookingId, connection) => {
    // 1. Kiểm tra trạng thái hiện tại (Tránh xử lý trùng lặp giữa FastConfirm và IPN)
    const [check] = await connection.query(
        "SELECT status, user_id, total_amount FROM bookings WHERE booking_id = ?", 
        [bookingId]
    );

    if (!check[0] || check[0].status === 'Completed') {
        return { alreadyDone: true, userId: check[0]?.user_id };
    }

    // 2. Cập nhật trạng thái Booking & Vé
    await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
    
    await connection.execute(
        `UPDATE tickets 
         SET seat_status = 'Booked', 
             ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
             updated_at = NOW()
         WHERE booking_id = ? AND seat_status = 'Reserved'`, 
        [bookingId]
    );

    // 3. Tính và cộng điểm thưởng (Dùng trường 'points')
    const totalEarnedPoints = Math.floor(Number(check[0].total_amount || 0) * 0.05);
    if (totalEarnedPoints > 0) {
        await connection.execute(
            "UPDATE users SET points = points + ? WHERE user_id = ?",
            [totalEarnedPoints, check[0].user_id]
        );
    }

    // 4. LẤY DATA CHI TIẾT ĐỂ GỬI MAIL VÉ
    const [orderRows] = await connection.query(`
        SELECT 
            b.booking_id, u.full_name, u.email,
            m.title AS movieTitle, m.poster_url AS moviePoster, 
            c.cinema_name AS cinemaName,
            DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time_raw,
            GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seatLabel
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.user_id
        LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
        LEFT JOIN movies m ON s.movie_id = m.movie_id
        LEFT JOIN cinemas c ON s.cinema_id = c.cinema_id 
        LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
        WHERE b.booking_id = ?
        GROUP BY b.booking_id
    `, [bookingId]);

    const order = orderRows[0];
    if (order) {
        const [foodRows] = await connection.query(
            "SELECT item_name, quantity FROM booking_details WHERE booking_id = ? AND seat_id IS NULL", 
            [bookingId]
        );
        const foodString = foodRows.map(f => `${f.item_name} (x${f.quantity})`).join(', ') || 'Không có';

        // Gửi mail ngầm
        mailService.sendTicketEmail(order.email, {
            bookingId: order.booking_id,
            customerName: order.full_name,
            movieTitle: order.movieTitle,
            moviePoster: order.moviePoster,
            cinemaName: order.cinemaName,
            startTime: order.start_time_raw.split(' ')[1].substring(0, 5),
            selectedDate: order.start_time_raw.split(' ')[0].split('-').reverse().join('/'),
            seatLabel: order.seatLabel,
            selectedFoods: foodString,
            earnedPoints: totalEarnedPoints
        }).catch(e => console.error("❌ [DŨNG] Lỗi gửi mail MoMo:", e.message));
    }

    return { alreadyDone: false, userId: check[0].user_id };
};

const MomoController = {
    // 1. TẠO GIAO DỊCH (Giữ nguyên cấu hình của Dũng)
    createPayment: async (req, res) => {
        try {
            const { bookingId, amount } = req.body;
            const partnerCode = 'MOMOBKUN20180810';
            const accessKey = 'klm05ndA99cl4UXT';
            const secretKey = 'f06nd13v6u1234567890abcdefghijk';
            const requestId = partnerCode + new Date().getTime();
            const orderId = bookingId;
            const orderInfo = `Thanh toán vé Cinema Star #${bookingId}`;
            
            const redirectUrl = "https://quangdungcinema.id.vn/confirm-success"; 
            const ipnUrl = "https://api.quangdungcinema.id.vn/api/momo/callback"; 

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
            res.status(500).json({ message: "Không thể tạo giao dịch" });
        }
    },

    // 2. XÁC NHẬN NHANH (Khi khách quay lại từ MoMo)
    confirmMomoFast: async (req, res) => {
        const { bookingId } = req.body;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await internalUpdateBooking(bookingId, connection);
            await connection.commit();

            res.json({ success: true, message: "Thanh toán thành công!" });
        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    // 3. CALLBACK (IPN) - MoMo gọi ngầm
    callback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await internalUpdateBooking(orderId, connection);
                await connection.commit();
            } catch (err) {
                if (connection) await connection.rollback();
                console.error("❌ [DŨNG IPN] Lỗi:", err.message);
            } finally {
                connection.release();
            }
        }
        return res.status(204).send(); 
    }
};

module.exports = MomoController;
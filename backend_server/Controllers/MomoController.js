const axios = require('axios');
const crypto = require('crypto');
const db = require('../Config/db');
const { sendTicketEmail } = require('./BankAppController'); 

/**
 * HÀM XỬ LÝ LÕI: Chốt đơn, Đổi trạng thái ghế, Cộng điểm
 * Tách ra để dùng chung cho cả ConfirmFast và Callback IPN
 */
const internalUpdateBooking = async (bookingId, connection) => {
    const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

    // 1. Kiểm tra trạng thái hiện tại (Tránh xử lý trùng lặp)
    const [check] = await connection.query(
        "SELECT status, user_id, total_price FROM bookings WHERE booking_id = ?", 
        [bookingId]
    );

    if (!check[0] || check[0].status === 'Completed') {
        return { alreadyDone: true, userId: check[0]?.user_id };
    }

    // 2. Cập nhật trạng thái Booking & Vé (Gộp lệnh chạy cho nhanh)
    await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
    
    await connection.execute(
        `UPDATE tickets t
         SET t.seat_status = 'Booked', 
             t.ticket_code = REPLACE(t.ticket_code, 'WAIT-', 'TIC-'),
             t.updated_at = ?
         WHERE t.booking_id = ? AND t.seat_status = 'Reserved'`, 
        [nowVN, bookingId]
    );

    // 3. Tính và cộng điểm (Dùng trường 'points' như Dũng dặn)
    // Giả định mức tích lũy 5% tổng đơn cho nhanh và nhẹ Database
    const totalEarnedPoints = Math.floor(Number(check[0].total_price || 0) * 0.05);
    
    if (totalEarnedPoints > 0) {
        await connection.execute(
            "UPDATE users SET points = points + ? WHERE user_id = ?",
            [totalEarnedPoints, check[0].user_id]
        );
        console.log(`✨ [DŨNG] Đã chốt đơn #${bookingId}: +${totalEarnedPoints} điểm cho User #${check[0].user_id}`);
    }

    return { alreadyDone: false, userId: check[0].user_id };
};

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
            
            const redirectUrl = "https://quangdungcinema.id.vn/confirm-success"; 
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
            res.status(500).json({ message: "Không thể tạo giao dịch" });
        }
    },

    // 2. XÁC NHẬN NHANH (Từ Frontend React gọi lên)
    confirmMomoFast: async (req, res) => {
        const { bookingId } = req.body;
        console.log(`>>> 🚀 [DŨNG] Frontend yêu cầu chốt nhanh đơn #${bookingId}`);

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const result = await internalUpdateBooking(bookingId, connection);
            
            await connection.commit();

            // Phản hồi ngay cho Frontend để không bị xoay vòng vòng (Timeout)
            res.json({ success: true, message: "Thanh toán thành công!" });

            // Việc gửi Email cho chạy ngầm bên dưới, không bắt khách phải chờ
            if (!result.alreadyDone) {
                // Tự gọi gửi mail ở đây nếu cần (không dùng await để tránh chậm)
                // sendTicketEmail(...).catch(e => console.log("Lỗi mail kệ nó"));
            }

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("❌ [DŨNG] Lỗi ConfirmFast:", error.message);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    // 3. CALLBACK (IPN) - MoMo tự gọi ngầm về
    callback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        console.log(`\n--- [DŨNG IPN] MoMo gọi về cho đơn #${orderId} (Code: ${resultCode}) ---`);

        if (resultCode === 0) {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await internalUpdateBooking(orderId, connection);
                await connection.commit();
                console.log("✅ [DŨNG IPN] Đã chốt đơn ngầm thành công!");
            } catch (err) {
                if (connection) await connection.rollback();
                console.error("❌ [DŨNG IPN] Lỗi xử lý ngầm:", err.message);
            } finally {
                connection.release();
            }
        }
        return res.status(204).send(); 
    }
};

module.exports = MomoController;
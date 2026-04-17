const db = require('../Config/db');
const mailService = require('../Services/MailServiceTicket'); // Gọi service gửi mail chuyên biệt

let otpStorage = {};

const BankAppController = {
    // 1. GỬI OTP
    sendOTP: async (req, res) => {
        const { email, bookingId } = req.body;
        if (!email || !bookingId) return res.status(400).json({ success: false, message: "Thiếu thông tin!" });

        const otp = Math.floor(100000 + Math.random() * 900000);
        // Lưu thời gian hết hạn sau 5 phút
        otpStorage[email] = { otp, bookingId, expires: Date.now() + 5 * 60 * 1000 };

        res.json({ success: true, message: "Mã OTP đang được gửi!" });

        // Gọi service gửi mail ngầm để không làm chậm response
        mailService.sendOTP(email, otp, bookingId).catch(err => console.error("Lỗi gửi OTP:", err));
    },

    // 2. XÁC THỰC OTP & CHỐT ĐƠN (Giữ nguyên logic gốc của ông)
    verifyOTP: async (req, res) => {
        const { email, otp, bookingId } = req.body;
        const record = otpStorage[email];

        if (!record || record.otp != otp || record.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Mã OTP không đúng hoặc đã hết hạn!" });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update trạng thái đơn hàng và vé
            await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
            await connection.execute(
                `UPDATE tickets SET seat_status = 'Booked', ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'), updated_at = NOW()
                 WHERE booking_id = ? AND seat_status = 'Reserved'`, [bookingId]
            );

            // 2. Lấy data đơn hàng (Giữ nguyên câu Query SELECT dài của ông)
            const [orderRows] = await connection.query(`
                SELECT 
                    b.booking_id, b.user_id, u.full_name, u.email,
                    m.title AS movieTitle, m.poster_url AS moviePoster, 
                    c.cinema_name AS cinemaName, r.room_name AS roomName,
                    DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time_raw,
                    GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seatLabel
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.user_id
                LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
                LEFT JOIN movies m ON s.movie_id = m.movie_id
                LEFT JOIN cinemas c ON s.cinema_id = c.cinema_id 
                LEFT JOIN rooms r ON s.room_id = r.room_id
                LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id
            `, [bookingId]);
            
            const order = orderRows[0];
            if (!order) throw new Error("Không tìm thấy dữ liệu đơn hàng!");

            // 3. Logic cộng điểm thưởng (VIP 10%, Đôi 7%, Thường 5%)
            const [details] = await connection.execute(
                `SELECT bd.price, bd.quantity, s.seat_type 
                 FROM booking_details bd
                 LEFT JOIN seats s ON bd.seat_id = s.seat_id
                 WHERE bd.booking_id = ?`, [bookingId]
            );

            let totalEarnedPoints = 0;
            details.forEach(item => {
                const itemTotal = Number(item.price) * Number(item.quantity);
                const type = String(item.seat_type || '').toUpperCase();
                let rate = (type === 'VIP') ? 0.10 : (['DOUBLE', 'SWEETBOX', 'COUPLE'].includes(type)) ? 0.07 : 0.05;
                totalEarnedPoints += Math.floor(itemTotal * rate);
            });

            if (totalEarnedPoints > 0) {
                await connection.execute(`UPDATE users SET points = points + ? WHERE user_id = ?`, [totalEarnedPoints, order.user_id]);
            }

            await connection.commit();
            delete otpStorage[email];

            // 4. CHUẨN BỊ DATA VÀ GỬI VÉ QUA SERVICE
            const [foodRows] = await connection.query("SELECT item_name, quantity FROM booking_details WHERE booking_id = ? AND seat_id IS NULL", [bookingId]);
            const foodString = foodRows.map(f => `${f.item_name} (x${f.quantity})`).join(', ') || 'Không có';

            mailService.sendTicketEmail(email, {
                bookingId: order.booking_id,
                customerName: order.full_name,
                movieTitle: order.movieTitle,
                moviePoster: order.moviePoster,
                cinemaName: order.cinemaName,
                startTime: order.start_time_raw.split(' ')[1].substring(0, 5),
                selectedDate: order.start_time_raw.split(' ')[0].split('-').reverse().join('/'),
                seatLabel: order.seatLabel,
                selectedFoods: foodString
            }).catch(e => console.error("Lỗi gửi vé:", e));

            res.json({ success: true, message: "Thanh toán thành công!", data: { orderId: order.booking_id } });

        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    // 5. BỔ SUNG: HÀM HỦY ĐƠN KHI QUÁ 5 PHÚT (HỦY TRẠNG THÁI PENDING)
    cancelBookingTimeout: async (req, res) => {
        const { bookingId, email } = req.body;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Chuyển trạng thái đơn hàng sang Cancelled
            await connection.execute("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?", [bookingId]);

            // Giải phóng ghế từ Reserved về Available trong bảng tickets
            await connection.execute(
                "UPDATE tickets SET seat_status = 'Available', booking_id = NULL WHERE booking_id = ?", 
                [bookingId]
            );

            await connection.commit();
            if (email) delete otpStorage[email]; // Xóa OTP thừa trong RAM

            res.json({ success: true, message: "Hết thời gian thanh toán, ghế đã được giải phóng." });
        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = BankAppController;
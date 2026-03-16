const db = require('../Config/db');

const PaymentController = {
    // 1. Giai đoạn 1: Khi khách chọn ghế xong và nhấn "Tiếp tục" (sang trang bắp nước/thanh toán)
    // Dũng nên đặt tên hàm là processReservation hoặc đặt trong luồng tạo đơn tạm
    processOrder: async (req, res) => {
        const { 
            userId, showtimeId, totalAmount, couponId, 
            selectedSeats, selectedFoods,
            customerEmail, customerName,
            movieTitle, moviePoster, cinemaName, startTime, selectedDate 
        } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const memo = `DUNG${Date.now()}`;

            // Tạo đơn hàng ở trạng thái 'Pending'
            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', memo]
            );
            const bookingId = bookingResult.insertId;

            // Xử lý lưu ghế vào bảng tickets với status là 'Reserved'
            if (selectedSeats && selectedSeats.length > 0) {
                for (let seat of selectedSeats) {
                    // Lưu vào chi tiết đơn hàng (booking_details)
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`, 1]
                    );

                    // QUAN TRỌNG: INSERT vào bảng tickets để khóa ghế trong 5 phút
                    // created_at sẽ tự động lấy NOW(), con Robot MySQL sẽ căn cứ vào đây để xóa sau 5 phút
                    const tempTicketCode = `WAIT-${Date.now()}-${seat.seat_id}`;
                    await connection.execute(
                        `INSERT INTO tickets (booking_id, showtime_id, seat_id, ticket_code, price, seat_status, ticket_status) 
                         VALUES (?, ?, ?, ?, ?, 'Reserved', 'Valid')`,
                        [bookingId, showtimeId, seat.seat_id, tempTicketCode, seat.price]
                    );
                }
            }

            // Lưu bắp nước (nếu có)
            if (selectedFoods && selectedFoods.length > 0) {
                for (let food of selectedFoods) {
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, food.product_id, food.product_name, food.quantity, food.price]
                    );
                }
            }

            await connection.commit();
            res.status(200).json({ 
                success: true, 
                bookingId: bookingId, 
                memo: memo,
                message: "Đã giữ ghế thành công, bạn có 5 phút để thanh toán!" 
            });

        } catch (error) {
            await connection.rollback();
            console.error("Lỗi đặt ghế:", error);
            res.status(500).json({ success: false, message: "Ghế này vừa có người giữ rồi Dũng ơi!" });
        } finally {
            connection.release();
        }
    },

    // 2. Giai đoạn 2: Khi khách thanh toán thành công (Dùng cho API Callback/IPN từ ngân hàng)
    completePayment: async (req, res) => {
        const { bookingId } = req.body; // Hoặc lấy từ webhook ngân hàng
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Cập nhật đơn hàng thành Completed
            await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);

            // CHỐT VÉ: Chuyển từ Reserved sang Booked
            // Khi chuyển sang Booked, Robot MySQL sẽ không bao giờ xóa dòng này nữa
            await connection.execute(
                `UPDATE tickets 
                 SET seat_status = 'Booked', 
                     ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                     updated_at = NOW()
                 WHERE booking_id = ? AND seat_status = 'Reserved'`,
                [bookingId]
            );

            await connection.commit();
            res.json({ success: true, message: "Thanh toán thành công, vé đã được chốt!" });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ success: false, message: "Lỗi khi chốt vé." });
        } finally {
            connection.release();
        }
    }
};

module.exports = PaymentController;
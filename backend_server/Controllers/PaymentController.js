const db = require('../Config/db');

const PaymentController = {
    // 1. Giai đoạn 1: Khi khách chọn ghế xong và nhấn "Tiếp tục"
    processOrder: async (req, res) => {
        const { 
            userId, showtimeId, totalAmount, couponId, 
            selectedSeats, selectedFoods
        } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Lấy room_id và cinema_id để tránh bị NULL (Giữ nguyên logic tốt của ông)
            const [showtimeRows] = await connection.execute(
                'SELECT room_id, cinema_id FROM showtimes WHERE showtime_id = ?',
                [showtimeId]
            );
            const room_id = showtimeRows.length > 0 ? showtimeRows[0].room_id : null;
            const cinema_id = showtimeRows.length > 0 ? showtimeRows[0].cinema_id : null;

            const memo = `DUNG${Date.now()}`;

            // Tạo đơn hàng ở trạng thái 'Pending'
            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', memo]
            );
            const bookingId = bookingResult.insertId;

            // Xử lý lưu ghế vào bảng tickets với status ban đầu là 'Reserved'
            if (selectedSeats && selectedSeats.length > 0) {
                for (let seat of selectedSeats) {
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`, 1]
                    );

                    const tempTicketCode = `WAIT-${Date.now()}-${seat.seat_id}`;
                    await connection.execute(
                        `INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'Reserved', 'Valid')`,
                        [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, tempTicketCode, seat.price]
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
            console.log(`>>> [DŨNG CINEMA] Đã tạo đơn hàng tạm thời #${bookingId}`);
            
            res.status(200).json({ 
                success: true, 
                bookingId: bookingId, 
                memo: memo,
                message: "Đã giữ ghế thành công, bạn có 5 phút để thanh toán!" 
            });

        } catch (error) {
            await connection.rollback();
            console.error("❌ Lỗi đặt ghế:", error);
            res.status(500).json({ success: false, message: "Ghế này vừa có người giữ rồi Dũng ơi!" });
        } finally {
            connection.release();
        }
    },

    // 2. Giai đoạn 2: Khi khách thanh toán thành công (QUAN TRỌNG NHẤT)
    completePayment: async (req, res) => {
        const { bookingId } = req.body; 
        
        if (!bookingId) {
            return res.status(400).json({ success: false, message: "Thiếu bookingId rồi ông ơi!" });
        }

        console.log(`>>> [DŨNG CINEMA] Đang chốt đơn hàng #${bookingId} sang trạng thái Completed...`);

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Cập nhật trạng thái đơn hàng (Bảng bookings)
            const [updateBooking] = await connection.execute(
                "UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", 
                [bookingId]
            );

            // Cập nhật trạng thái ghế từ Reserved sang Booked (Bảng tickets)
            // Đồng thời đổi mã vé từ WAIT- sang TIC- cho chuyên nghiệp
            const [updateTickets] = await connection.execute(
                `UPDATE tickets 
                 SET seat_status = 'Booked', 
                     ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                     updated_at = NOW()
                 WHERE booking_id = ? AND seat_status = 'Reserved'`,
                [bookingId]
            );

            if (updateBooking.affectedRows === 0) {
                throw new Error("Không tìm thấy đơn hàng để cập nhật!");
            }

            await connection.commit();
            console.log(`✅ [DŨNG CINEMA] Chốt đơn #${bookingId} THÀNH CÔNG. Ghế đã được khóa.`);
            
            res.json({ 
                success: true, 
                message: "Thanh toán thành công, vé đã được chốt và ghế đã được khóa!" 
            });
        } catch (error) {
            await connection.rollback();
            console.error("❌ Lỗi khi chốt vé:", error.message);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi chốt vé." });
        } finally {
            connection.release();
        }
    }
};

module.exports = PaymentController;
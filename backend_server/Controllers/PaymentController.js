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
            const [showtimeRows] = await connection.execute(
                'SELECT room_id, cinema_id FROM showtimes WHERE showtime_id = ?',
                [showtimeId]
            );
            const room_id = showtimeRows.length > 0 ? showtimeRows[0].room_id : null;
            const cinema_id = showtimeRows.length > 0 ? showtimeRows[0].cinema_id : null;

            const memo = `DUNG${Date.now()}`;

            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', memo]
            );
            const bookingId = bookingResult.insertId;

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

    // 2. Giai đoạn 2: Khi khách thanh toán thành công (ĐÃ BỔ SUNG CỘNG ĐIỂM)
    completePayment: async (req, res) => {
        const { bookingId } = req.body; 
        
        if (!bookingId) {
            return res.status(400).json({ success: false, message: "Thiếu bookingId rồi ông ơi!" });
        }

        console.log(`>>> [DŨNG CINEMA] Đang chốt đơn hàng #${bookingId} sang trạng thái Completed...`);

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // --- BƯỚC MỚI: Lấy thông tin cũ để kiểm tra trước khi update ---
            const [currentBooking] = await connection.execute(
                `SELECT user_id, status FROM bookings WHERE booking_id = ?`,
                [bookingId]
            );

            if (currentBooking.length === 0) {
                throw new Error("Không tìm thấy đơn hàng!");
            }

            const { user_id, status: oldStatus } = currentBooking[0];

            // --- GIỮ NGUYÊN CODE CŨ CỦA ÔNG ---
            const [updateBooking] = await connection.execute(
                "UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", 
                [bookingId]
            );

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

            // --- BỔ SUNG: LOGIC CỘNG ĐIỂM CHI TIẾT ---
            // Chỉ cộng điểm nếu trạng thái cũ chưa phải là 'Completed' (tránh cộng trùng)
            if (String(oldStatus).toLowerCase() !== 'completed') {
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
                    
                    if (item.seat_type) {
                        // Tính điểm cho VÉ (VIP 10%, Đôi 7%, Thường 5%)
                        const type = String(item.seat_type).toUpperCase();
                        let rate = 0.05; 
                        if (type === 'VIP') rate = 0.10;
                        else if (type === 'DOUBLE' || type === 'SWEETBOX') rate = 0.07;
                        
                        totalEarnedPoints += Math.floor(itemTotal * rate);
                    } else {
                        // Tính điểm cho BẮP NƯỚC (3%)
                        totalEarnedPoints += Math.floor(itemTotal * 0.03);
                    }
                });

                if (totalEarnedPoints > 0) {
                    await connection.execute(
                        `UPDATE users SET points = points + ? WHERE user_id = ?`,
                        [totalEarnedPoints, user_id]
                    );
                    console.log(`✨ [DŨNG] Thanh toán xong! Đã tích ${totalEarnedPoints} điểm cho User #${user_id}`);
                }
            }

            await connection.commit();
            console.log(`✅ [DŨNG CINEMA] Chốt đơn #${bookingId} THÀNH CÔNG. Ghế đã được khóa.`);
            
            res.json({ 
                success: true, 
                message: "Thanh toán thành công, vé đã được chốt và bạn đã nhận được điểm thưởng!" 
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
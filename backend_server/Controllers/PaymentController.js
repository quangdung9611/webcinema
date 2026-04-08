const db = require('../Config/db');

const PaymentController = {
    // 1. Giai đoạn 1: Khi khách chọn ghế xong và nhấn "Tiếp tục" (Giữ nguyên logic của Dũng)
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

            const currentTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
            const memo = `DUNG${Date.now()}`;

            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', currentTimeVN, memo]
            );
            const bookingId = bookingResult.insertId;

            if (selectedSeats && selectedSeats.length > 0) {
                const uniqueSeats = selectedSeats.filter((seat, index, self) =>
                    index === self.findIndex((t) => t.seat_id === seat.seat_id)
                );

                for (let seat of uniqueSeats) {
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`, 1]
                    );

                    const tempTicketCode = `WAIT-${Date.now()}-${seat.seat_id}`;
                    await connection.execute(
                        `INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'Reserved', 'Valid', ?)`,
                        [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, tempTicketCode, seat.price, currentTimeVN]
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
            res.status(200).json({ success: true, bookingId: bookingId, memo: memo });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ success: false, message: "Lỗi đặt ghế rồi Dũng ơi!" });
        } finally {
            connection.release();
        }
    },

    // --- HÀM CỐT LÕI: XỬ LÝ CHỐT ĐƠN (Dùng chung cho cả Web và MoMo) ---
    executeCompletion: async (bookingId, connection) => {
        const [currentBooking] = await connection.execute(
            `SELECT user_id, status FROM bookings WHERE booking_id = ?`,
            [bookingId]
        );

        if (currentBooking.length === 0) throw new Error("Không tìm thấy đơn hàng!");

        const { user_id, status: oldStatus } = currentBooking[0];
        
        // Nếu đơn đã xong rồi thì không chạy lại (tránh cộng điểm 2 lần)
        if (String(oldStatus).toLowerCase() === 'completed') {
            return { success: true, message: "Đơn này đã được chốt trước đó." };
        }

        const updateTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        // 1. Cập nhật trạng thái Booking
        await connection.execute(
            "UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", 
            [bookingId]
        );

        // 2. Cập nhật vé (Chuyển Reserved -> Booked)
        await connection.execute(
            `UPDATE tickets 
             SET seat_status = 'Booked', 
                 ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                 updated_at = ?
             WHERE booking_id = ? AND seat_status = 'Reserved'`,
            [updateTimeVN, bookingId]
        );

        // 3. Cập nhật bảng seats
        await connection.execute(
            `UPDATE seats 
             SET seat_status = 'Booked' 
             WHERE seat_id IN (
                SELECT seat_id FROM booking_details WHERE booking_id = ? AND seat_id IS NOT NULL
             )`,
            [bookingId]
        );

        // 4. Logic cộng điểm
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
                const type = String(item.seat_type).toUpperCase();
                let rate = (type === 'VIP') ? 0.10 : (['DOUBLE', 'SWEETBOX', 'COUPLE'].includes(type) ? 0.07 : 0.05);
                totalEarnedPoints += Math.floor(itemTotal * rate);
            } else {
                totalEarnedPoints += Math.floor(itemTotal * 0.03); // Đồ ăn
            }
        });

        if (totalEarnedPoints > 0) {
            await connection.execute(
                `UPDATE users SET points = points + ? WHERE user_id = ?`,
                [totalEarnedPoints, user_id]
            );
        }

        return { success: true, message: "Chốt đơn và tích điểm thành công!" };
    },

    // 2. Giai đoạn 2: API dành cho Frontend React gọi
    completePayment: async (req, res) => {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ success: false, message: "Thiếu bookingId!" });

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await PaymentController.executeCompletion(bookingId, connection);
            await connection.commit();
            res.json(result);
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    // 3. HÀM MỚI: API dành riêng cho MoMo gọi Callback (IPN)
    momoCallback: async (req, res) => {
        const { orderId, resultCode } = req.body; // MoMo gửi orderId chính là bookingId
        console.log(`>>> [DŨNG MOMO] Nhận tín hiệu đơn #${orderId}, Code: ${resultCode}`);

        if (resultCode === 0) {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await PaymentController.executeCompletion(orderId, connection);
                await connection.commit();
                console.log(`✅ [DŨNG] MoMo IPN đã chốt đơn #${orderId} thành công.`);
            } catch (err) {
                await connection.rollback();
                console.error("❌ [DŨNG] Lỗi IPN:", err.message);
            } finally {
                connection.release();
            }
        }
        // Luôn trả về 204 cho MoMo để nó ngừng nhắc lại
        return res.status(204).send();
    }
};

module.exports = PaymentController;
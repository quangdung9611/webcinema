const db = require('../Config/db');

const PaymentController = {
    // 1. Giai đoạn 1: Giữ nguyên logic của Dũng
    processOrder: async (req, res) => {
        const { userId, showtimeId, totalAmount, couponId, selectedSeats, selectedFoods } = req.body;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [showtimeRows] = await connection.execute(
                'SELECT room_id, cinema_id FROM showtimes WHERE showtime_id = ?', [showtimeId]
            );
            const { room_id, cinema_id } = showtimeRows[0] || { room_id: null, cinema_id: null };

            const currentTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
            const memo = `DUNG${Date.now()}`;

            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', currentTimeVN, memo]
            );
            const bookingId = bookingResult.insertId;

            if (selectedSeats?.length > 0) {
                for (let seat of selectedSeats) {
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`, 1]
                    );
                    const tempCode = `WAIT-${Date.now()}-${seat.seat_id}`;
                    await connection.execute(
                        `INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'Reserved', 'Valid', ?)`,
                        [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, tempCode, seat.price, currentTimeVN]
                    );
                }
            }

            if (selectedFoods?.length > 0) {
                for (let food of selectedFoods) {
                    await connection.execute(
                        'INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                        [bookingId, food.product_id, food.product_name, food.quantity, food.price]
                    );
                }
            }

            await connection.commit();
            res.status(200).json({ success: true, bookingId, memo });
        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: "Lỗi giữ ghế!" });
        } finally {
            connection.release();
        }
    },

    // --- HÀM HỖ TRỢ CỘNG ĐIỂM (Giữ nguyên logic tính points của Dũng) ---
    addPoints: async (bookingId, userId, connection) => {
        const [details] = await connection.execute(
            "SELECT price, quantity, seat_id FROM booking_details WHERE booking_id = ?", [bookingId]
        );

        let totalPoints = 0;
        details.forEach(item => {
            const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
            totalPoints += item.seat_id ? Math.floor(lineTotal * 0.05) : Math.floor(lineTotal * 0.03);
        });

        if (totalPoints > 0) {
            await connection.execute("UPDATE users SET points = points + ? WHERE user_id = ?", [totalPoints, userId]);
            console.log(`✨ [DŨNG] +${totalPoints} points cho User #${userId}`);
        }
    },

    // --- HÀM 1: DÀNH CHO MOMO (Khắt khe trạng thái Reserved) ---
    executeMomoCompletion: async (bookingId, connection) => {
        const [current] = await connection.execute("SELECT user_id, status FROM bookings WHERE booking_id = ?", [bookingId]);
        if (current.length === 0 || String(current[0].status).toLowerCase() === 'completed') return;

        const updateTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
        
        // MoMo cần check 'Reserved' vì nó xử lý tức thì
        await connection.execute(
            `UPDATE tickets SET seat_status = 'Booked', ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'), updated_at = ? 
             WHERE booking_id = ? AND seat_status = 'Reserved'`, [updateTimeVN, bookingId]
        );

        await connection.execute(
            `UPDATE seats s JOIN booking_details bd ON s.seat_id = bd.seat_id 
             SET s.seat_status = 'Booked' WHERE bd.booking_id = ?`, [bookingId]
        );

        await PaymentController.addPoints(bookingId, current[0].user_id, connection);
    },

    // --- HÀM 2: DÀNH CHO BANKAPP (Nới lỏng trạng thái để tránh lỗi hết hạn OTP) ---
    executeBankCompletion: async (bookingId, connection) => {
        const [current] = await connection.execute("SELECT user_id, status FROM bookings WHERE booking_id = ?", [bookingId]);
        if (current.length === 0 || String(current[0].status).toLowerCase() === 'completed') return;

        const updateTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
        
        // BankApp KHÔNG check 'Reserved' để tránh lỗi khi mail/OTP gửi về chậm
        await connection.execute(
            `UPDATE tickets SET seat_status = 'Booked', ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'), updated_at = ? 
             WHERE booking_id = ?`, [updateTimeVN, bookingId]
        );

        await connection.execute(
            `UPDATE seats s JOIN booking_details bd ON s.seat_id = bd.seat_id 
             SET s.seat_status = 'Booked' WHERE bd.booking_id = ?`, [bookingId]
        );

        await PaymentController.addPoints(bookingId, current[0].user_id, connection);
    },

    // 2. API cho React (Dùng cho BankApp)
    completePayment: async (req, res) => {
        const { bookingId } = req.body;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // Gọi hàm xử lý riêng cho Bank
            await PaymentController.executeBankCompletion(bookingId, connection);
            await connection.commit();
            res.json({ success: true });
        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    // 3. API cho MoMo (IPN)
    momoCallback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                // Gọi hàm xử lý riêng cho MoMo
                await PaymentController.executeMomoCompletion(orderId, connection);
                await connection.commit();
            } catch (err) {
                if (connection) await connection.rollback();
            } finally {
                connection.release();
            }
        }
        return res.status(204).send();
    }
};

module.exports = PaymentController;
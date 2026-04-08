const db = require('../Config/db');

const PaymentController = {
    // 1. Giai đoạn 1: Khi khách nhấn "Tiếp tục" - Tạo đơn Pending & Giữ ghế Reserved
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

            // Tạo đơn hàng trạng thái Pending
            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, showtimeId, totalAmount, couponId || null, 'Pending', currentTimeVN, memo]
            );
            const bookingId = bookingResult.insertId;

            // Chốt vé tạm thời (Reserved)
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

            // Lưu thông tin đồ ăn
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

    // --- HÀM CỐT LÕI: CHỐT ĐƠN & CỘNG ĐIỂM (INTERNAL) ---
    executeCompletion: async (bookingId, connection) => {
        const [current] = await connection.execute("SELECT user_id, status FROM bookings WHERE booking_id = ?", [bookingId]);
        if (current.length === 0) throw new Error("Không tìm thấy đơn!");
        if (String(current[0].status).toLowerCase() === 'completed') return { success: true };

        const updateTimeVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        // 1. Chốt đơn & Vé
        await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);
        await connection.execute(
            `UPDATE tickets SET seat_status = 'Booked', ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'), updated_at = ? 
             WHERE booking_id = ? AND seat_status = 'Reserved'`, [updateTimeVN, bookingId]
        );

        // 2. Chốt trạng thái ghế (Dùng JOIN để tránh lỗi MySQL)
        await connection.execute(
            `UPDATE seats s 
             JOIN booking_details bd ON s.seat_id = bd.seat_id 
             SET s.seat_status = 'Booked' WHERE bd.booking_id = ?`, [bookingId]
        );

        // 3. Tính điểm thưởng (Dùng trường 'points' -)
        const [details] = await connection.execute(
            "SELECT price, quantity, seat_id FROM booking_details WHERE booking_id = ?", [bookingId]
        );

        let totalPoints = 0;
        details.forEach(item => {
            const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
            totalPoints += item.seat_id ? Math.floor(lineTotal * 0.05) : Math.floor(lineTotal * 0.03);
        });

        if (totalPoints > 0) {
            await connection.execute("UPDATE users SET points = points + ? WHERE user_id = ?", [totalPoints, current[0].user_id]);
            console.log(`✨ [DŨNG] +${totalPoints} points cho User #${current[0].user_id}`);
        }
        return { success: true };
    },

    // 2. API cho React gọi
    completePayment: async (req, res) => {
        const { bookingId } = req.body;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await PaymentController.executeCompletion(bookingId, connection);
            await connection.commit();
            res.json(result);
        } catch (error) {
            if (connection) await connection.rollback();
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    },

    // 3. API cho MoMo gọi (IPN)
    momoCallback: async (req, res) => {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await PaymentController.executeCompletion(orderId, connection);
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
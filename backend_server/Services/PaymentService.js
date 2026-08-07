const db = require('../Config/db');
const crypto = require('crypto');

// =========================================================
// LƯU TẠM VÀO MEMORY (nên dùng Redis cho production)
// =========================================================
const tempBookings = new Map();

const generateTempBookingId = () => {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
};

class PaymentService {

    /*=========================================================
        1. PROCESS ORDER – CHỈ LƯU TẠM, KHÔNG VÀO DB
    =========================================================*/
    async processOrder(data) {
        const {
            userId,
            showtimeId,
            totalAmount,
            couponId,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            cinemaName,
            startTime
        } = data;

        // 1. Lấy thông tin showtime
        const [rows] = await db.execute(
            `SELECT room_id, cinema_id FROM showtimes WHERE showtime_id = ?`,
            [showtimeId]
        );

        if (!rows.length) {
            throw new Error('Không tìm thấy suất chiếu');
        }

        const room_id = rows[0].room_id;
        const cinema_id = rows[0].cinema_id;

        // 2. Tạo ID tạm
        const tempBookingId = generateTempBookingId();

        // 3. Kiểm tra ghế có bị người khác đặt chưa (trong DB đã completed)
        for (const seat of selectedSeats) {
            const [existing] = await db.execute(
                `
                SELECT t.ticket_id 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE t.showtime_id = ? 
                  AND t.cinema_id = ? 
                  AND t.room_id = ? 
                  AND t.seat_id = ?
                  AND b.status = 'Completed'
                `,
                [showtimeId, cinema_id, room_id, seat.seat_id]
            );
            if (existing.length > 0) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`);
            }
        }

        // 4. Lưu vào temp
        const tempData = {
            tempBookingId,
            userId,
            showtimeId,
            room_id,
            cinema_id,
            totalAmount,
            couponId: couponId || null,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            cinemaName,
            startTime,
            status: 'pending',
            createdAt: Date.now()
        };

        tempBookings.set(tempBookingId, tempData);

        // 5. Tự động xóa sau 10 phút
        setTimeout(() => {
            if (tempBookings.has(tempBookingId)) {
                tempBookings.delete(tempBookingId);
                console.log(`🗑️ Temp booking ${tempBookingId} expired and removed`);
            }
        }, 600000);

        console.log(`✅ Temp booking created: ${tempBookingId}`);

        return { tempBookingId };
    }

    /*=========================================================
        2. COMMIT TO DATABASE – KHI OTP THÀNH CÔNG
    =========================================================*/
    async commitToDatabase(connection, tempBookingId) {
        // 1. Lấy dữ liệu tạm
        const tempData = tempBookings.get(tempBookingId);
        if (!tempData) {
            throw new Error('Phiên đặt vé đã hết hạn. Vui lòng đặt lại.');
        }

        const {
            userId,
            showtimeId,
            room_id,
            cinema_id,
            totalAmount,
            couponId,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone
        } = tempData;

        // 2. Kiểm tra ghế vẫn còn trống (phòng trường hợp timeout)
        for (const seat of selectedSeats) {
            const [existing] = await connection.execute(
                `
                SELECT t.ticket_id 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE t.showtime_id = ? 
                  AND t.cinema_id = ? 
                  AND t.room_id = ? 
                  AND t.seat_id = ?
                  AND b.status = 'Completed'
                `,
                [showtimeId, cinema_id, room_id, seat.seat_id]
            );
            if (existing.length > 0) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`);
            }
        }

        // 3. Tạo booking
        const memo = `DUNG${Date.now()}`;

        const [result] = await connection.execute(
            `
            INSERT INTO bookings
            (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo, email)
            VALUES (?, ?, ?, ?, 'Completed', NOW(), ?, ?)
            `,
            [userId, showtimeId, totalAmount, couponId || null, memo, customerEmail]
        );

        const bookingId = result.insertId;

        // 4. Tạo booking_details và tickets cho ghế
        for (const seat of selectedSeats) {
            // Booking detail
            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, seat_id, price, item_name, quantity)
                VALUES (?, ?, ?, ?, 1)
                `,
                [
                    bookingId,
                    seat.seat_id,
                    seat.price,
                    `Ghế ${seat.seat_row}${seat.seat_number}`
                ]
            );

            // Ticket
            const ticketCode = `TIC-${bookingId}-${seat.seat_id}-${Date.now()}`;
            await connection.execute(
                `
                INSERT INTO tickets
                (
                    booking_id,
                    showtime_id,
                    room_id,
                    cinema_id,
                    seat_id,
                    ticket_code,
                    price,
                    seat_status,
                    ticket_status,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW())
                `,
                [
                    bookingId,
                    showtimeId,
                    room_id,
                    cinema_id,
                    seat.seat_id,
                    ticketCode,
                    seat.price
                ]
            );
        }

        // 5. Tạo booking_details cho food
        for (const food of selectedFoods) {
            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, product_id, item_name, quantity, price)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    bookingId,
                    food.product_id,
                    food.product_name,
                    food.quantity,
                    food.price
                ]
            );
        }

        // 6. Cộng điểm (nếu có)
        if (userId) {
            // Tính điểm dựa trên số tiền
            const points = Math.floor(totalAmount * 0.05);
            if (points > 0) {
                await connection.execute(
                    `UPDATE users SET points = points + ? WHERE user_id = ?`,
                    [points, userId]
                );
            }
        }

        // 7. Xóa temp sau khi commit thành công
        tempBookings.delete(tempBookingId);
        console.log(`✅ Booking ${bookingId} committed, temp ${tempBookingId} removed`);

        return { bookingId, memo };
    }

    /*=========================================================
        3. GET TEMP DATA
    =========================================================*/
    getTempData(tempBookingId) {
        return tempBookings.get(tempBookingId) || null;
    }

    /*=========================================================
        4. DELETE TEMP DATA
    =========================================================*/
    deleteTempData(tempBookingId) {
        const deleted = tempBookings.delete(tempBookingId);
        if (deleted) {
            console.log(`🗑️ Temp booking ${tempBookingId} deleted`);
        }
        return deleted;
    }
}

module.exports = new PaymentService();
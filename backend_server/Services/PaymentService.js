const db = require('../Config/db');
const RedisService = require('./RedisService'); // Dùng RedisService đã có
const crypto = require('crypto');

const generateTempBookingId = () => {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Hằng số TTL 5 phút
const TEMP_BOOKING_TTL = 300; // 5 phút

class PaymentService {

    /*=========================================================
        1. PROCESS ORDER – LƯU TẠM VÀO REDIS (TTL 300s)
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

        // 1. Lấy room_id, cinema_id từ DB
        const [rows] = await db.execute(
            `SELECT room_id, cinema_id FROM showtimes WHERE showtime_id = ?`,
            [showtimeId]
        );
        if (!rows.length) throw new Error('Không tìm thấy suất chiếu');
        const room_id = rows[0].room_id;
        const cinema_id = rows[0].cinema_id;

        // 2. Kiểm tra ghế đã có ai đặt Completed chưa (trong DB)
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

        // 3. Tạo tempId và lưu vào Redis (dùng RedisService.set)
        const tempBookingId = generateTempBookingId();
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

        const key = `temp:${tempBookingId}`;
        await RedisService.set(key, JSON.stringify(tempData), TEMP_BOOKING_TTL);
        console.log(`✅ Temp booking saved to Redis: ${tempBookingId} (TTL ${TEMP_BOOKING_TTL}s)`);

        return { tempBookingId };
    }

    /*=========================================================
        2. COMMIT TO DATABASE – KHI OTP THÀNH CÔNG
    =========================================================*/
    async commitToDatabase(connection, tempBookingId) {
        const key = `temp:${tempBookingId}`;
        const raw = await RedisService.get(key);
        if (!raw) {
            throw new Error('Phiên đặt vé đã hết hạn. Vui lòng đặt lại.');
        }
        const tempData = JSON.parse(raw);
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

        // Kiểm tra lại ghế (phòng trường hợp có người khác đặt trong lúc chờ OTP)
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

        // Tạo booking
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

        // Ghế -> booking_details + tickets
        for (const seat of selectedSeats) {
            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, seat_id, price, item_name, quantity)
                VALUES (?, ?, ?, ?, 1)
                `,
                [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`]
            );

            const ticketCode = `TIC-${bookingId}-${seat.seat_id}-${Date.now()}`;
            await connection.execute(
                `
                INSERT INTO tickets
                (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW())
                `,
                [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, ticketCode, seat.price]
            );
        }

        // Đồ ăn -> booking_details
        for (const food of selectedFoods) {
            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, product_id, item_name, quantity, price)
                VALUES (?, ?, ?, ?, ?)
                `,
                [bookingId, food.product_id, food.product_name, food.quantity, food.price]
            );
        }

        // Cộng điểm
        if (userId) {
            const points = Math.floor(totalAmount * 0.05);
            if (points > 0) {
                await connection.execute(
                    `UPDATE users SET points = points + ? WHERE user_id = ?`,
                    [points, userId]
                );
            }
        }

        // Xóa khỏi Redis sau khi commit thành công
        await RedisService.delete(key);
        console.log(`✅ Booking ${bookingId} committed, temp ${tempBookingId} removed from Redis`);

        return { bookingId, memo, userId };
    }

    /*=========================================================
        3. GET TEMP DATA
    =========================================================*/
    async getTempData(tempBookingId) {
        const key = `temp:${tempBookingId}`;
        const raw = await RedisService.get(key);
        return raw ? JSON.parse(raw) : null;
    }

    /*=========================================================
        4. DELETE TEMP DATA
    =========================================================*/
    async deleteTempData(tempBookingId) {
        const key = `temp:${tempBookingId}`;
        const deleted = await RedisService.delete(key);
        if (deleted) console.log(`🗑️ Temp booking ${tempBookingId} deleted from Redis`);
        return deleted;
    }
}

module.exports = new PaymentService();
const db = require("../Config/db");
const RedisService = require("./RedisService");
const crypto = require("crypto");
const MailServiceTicket = require("../Services/MailServiceTicket"); // 👈 THÊM IMPORT

const TEMP_BOOKING_TTL = 300; // 5 phút

const generateTempBookingId = () => {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
};

class PaymentService {

    /*=========================================================
        1. PROCESS ORDER – LƯU TẠM VÀO REDIS
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

        /*=====================================================
            LẤY room_id + cinema_id + room_name
        =====================================================*/

        const [rows] = await db.execute(
            `
            SELECT 
                s.room_id, 
                s.cinema_id,
                r.room_name          -- 👈 LẤY TÊN PHÒNG
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            WHERE s.showtime_id = ?
            `,
            [showtimeId]
        );

        if (!rows.length) {
            throw new Error("Không tìm thấy suất chiếu");
        }

        const room_id = rows[0].room_id;
        const cinema_id = rows[0].cinema_id;
        const room_name = rows[0].room_name || '---'; // 👈 LƯU TÊN PHÒNG

        /*=====================================================
            KIỂM TRA GHẾ ĐÃ ĐƯỢC ĐẶT CHƯA
        =====================================================*/

        for (const seat of selectedSeats) {

            const [existing] = await db.execute(
                `
                SELECT t.ticket_id
                FROM tickets t
                JOIN bookings b
                    ON t.booking_id = b.booking_id
                WHERE
                    t.showtime_id = ?
                    AND t.cinema_id = ?
                    AND t.room_id = ?
                    AND t.seat_id = ?
                    AND b.status = 'Completed'
                `,
                [
                    showtimeId,
                    cinema_id,
                    room_id,
                    seat.seat_id
                ]
            );

            if (existing.length > 0) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`
                );

            }
        }

        /*=====================================================
            TẠO TEMP BOOKING
        =====================================================*/

        const tempBookingId = generateTempBookingId();

        const tempData = {

            tempBookingId,

            userId,

            showtimeId,

            room_id,

            cinema_id,
            
            room_name,      // 👈 THÊM room_name VÀO TEMP DATA

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

            status: "pending",

            createdAt: Date.now()

        };

        /*=====================================================
            LƯU REDIS
        =====================================================*/

        const key = `temp:${tempBookingId}`;

        await RedisService.set(
            key,
            tempData,
            TEMP_BOOKING_TTL
        );

        console.log(
            `✅ Temp booking ${tempBookingId} saved (${TEMP_BOOKING_TTL}s)`
        );

        return {
            tempBookingId
        };

    }

    /*=========================================================
        2. COMMIT TO DATABASE – KHI OTP THÀNH CÔNG
    =========================================================*/
    async commitToDatabase(connection, tempBookingId) {

        const key = `temp:${tempBookingId}`;

        let tempData = await RedisService.get(key);

        if (!tempData) {
            throw new Error("Phiên đặt vé đã hết hạn. Vui lòng đặt lại.");
        }

        // Hỗ trợ cả Upstash (object) và Redis thường (string)
        if (typeof tempData === "string") {
            tempData = JSON.parse(tempData);
        }

        const {
            userId,
            showtimeId,
            room_id,
            cinema_id,
            room_name,      // 👈 LẤY room_name TỪ TEMP DATA
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
        } = tempData;

        /*=====================================================
            KIỂM TRA GHẾ LẦN CUỐI
        =====================================================*/

        for (const seat of selectedSeats) {

            const [existing] = await connection.execute(
                `
                SELECT t.ticket_id
                FROM tickets t
                JOIN bookings b
                    ON t.booking_id = b.booking_id
                WHERE
                    t.showtime_id = ?
                    AND t.cinema_id = ?
                    AND t.room_id = ?
                    AND t.seat_id = ?
                    AND b.status = 'Completed'
                `,
                [
                    showtimeId,
                    cinema_id,
                    room_id,
                    seat.seat_id
                ]
            );

            if (existing.length > 0) {
                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`
                );
            }
        }

        /*=====================================================
            TẠO BOOKING
        =====================================================*/

        const memo = `DUNG${Date.now()}`;

        const [bookingResult] = await connection.execute(
            `
            INSERT INTO bookings
            (
                user_id,
                showtime_id,
                total_amount,
                coupon_id,
                status,
                booking_date,
                memo,
                email
            )
            VALUES
            (
                ?, ?, ?, ?, 'Completed', NOW(), ?, ?
            )
            `,
            [
                userId,
                showtimeId,
                totalAmount,
                couponId || null,
                memo,
                customerEmail
            ]
        );

        const bookingId = bookingResult.insertId;

        /*=====================================================
            THÊM GHẾ
        =====================================================*/

        const seatLabels = [];

        for (const seat of selectedSeats) {

            await connection.execute(
                `
                INSERT INTO booking_details
                (
                    booking_id,
                    seat_id,
                    price,
                    item_name,
                    quantity
                )
                VALUES
                (
                    ?, ?, ?, ?, 1
                )
                `,
                [
                    bookingId,
                    seat.seat_id,
                    seat.price,
                    `Ghế ${seat.seat_row}${seat.seat_number}`
                ]
            );

            const ticketCode =
                `TIC-${bookingId}-${seat.seat_id}-${Date.now()}`;

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
                VALUES
                (
                    ?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW()
                )
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

            // Lưu lại label ghế để gửi email
            seatLabels.push(`${seat.seat_row}${seat.seat_number}`);
        }

        const seatLabel = seatLabels.join(', ');

        /*=====================================================
            THÊM ĐỒ ĂN
        =====================================================*/

        let foodNames = [];

        if (selectedFoods && selectedFoods.length > 0) {

            for (const food of selectedFoods) {

                await connection.execute(
                    `
                    INSERT INTO booking_details
                    (
                        booking_id,
                        product_id,
                        item_name,
                        quantity,
                        price
                    )
                    VALUES
                    (
                        ?, ?, ?, ?, ?
                    )
                    `,
                    [
                        bookingId,
                        food.product_id,
                        food.product_name,
                        food.quantity,
                        food.price
                    ]
                );

                foodNames.push(`${food.product_name} x${food.quantity}`);
            }
        }

        const selectedFoodsText = foodNames.length > 0 ? foodNames.join(', ') : 'Không có';

        /*=====================================================
            CỘNG ĐIỂM
        =====================================================*/

        let earnedPoints = 0;

        if (userId) {

            const points = Math.floor(totalAmount * 0.05);

            if (points > 0) {

                earnedPoints = points;

                await connection.execute(
                    `
                    UPDATE users
                    SET points = points + ?
                    WHERE user_id = ?
                    `,
                    [
                        points,
                        userId
                    ]
                );
            }
        }

        /*=====================================================
            XÓA TEMP REDIS
        =====================================================*/

        await RedisService.delete(key);

        console.log(
            `✅ Booking ${bookingId} committed successfully`
        );

        /*=====================================================
            🎫 GỬI EMAIL VÉ SAU KHI COMMIT
        =====================================================*/
        
        try {
            
            // Format lại thời gian
            const formattedTime = startTime ? new Date(startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---';
            const formattedDate = startTime ? new Date(startTime).toLocaleDateString('vi-VN') : '---';

            // Lấy poster từ database
            const [posterResult] = await connection.execute(
                `
                SELECT m.movie_poster
                FROM showtimes s
                JOIN movies m ON s.movie_id = m.movie_id
                WHERE s.showtime_id = ?
                `,
                [showtimeId]
            );

            const moviePoster = posterResult[0]?.movie_poster || null;

            // Tạo ticket data với room_name
            const ticketData = {
                bookingId: bookingId,
                customerName: customerName || 'Khách hàng',
                seatLabel: seatLabel,
                movieTitle: movieTitle || 'Phim',
                cinemaName: cinemaName || 'Rạp',
                startTime: formattedTime,
                selectedDate: formattedDate,
                selectedFoods: selectedFoodsText,
                earnedPoints: earnedPoints,
                ticketPIN: `#${bookingId}`,
                moviePoster: moviePoster,
                roomName: room_name || '---' // 👈 THÊM room_name VÀO EMAIL
            };

            // Gửi email
            await MailServiceTicket.sendTicketEmail(customerEmail, ticketData);

            console.log(`📧 Ticket email sent to ${customerEmail} for booking ${bookingId}`);

        } catch (emailError) {
            // Không throw lỗi, chỉ log để không làm hỏng luồng thanh toán
            console.error('❌ Failed to send ticket email:', emailError);
        }

        return {
            bookingId,
            memo,
            userId,
            room_name
        };

    }

    /*=========================================================
        3. GET TEMP DATA
    =========================================================*/
    async getTempData(tempBookingId) {

        const key = `temp:${tempBookingId}`;

        let tempData = await RedisService.get(key);

        if (!tempData) {
            return null;
        }

        // Tương thích cả Upstash Redis và Redis thường
        if (typeof tempData === "string") {
            try {
                tempData = JSON.parse(tempData);
            } catch (error) {
                console.error("❌ Parse temp booking error:", error);
                return null;
            }
        }

        return tempData;
    }

    /*=========================================================
        4. DELETE TEMP DATA
    =========================================================*/
    async deleteTempData(tempBookingId) {

        const key = `temp:${tempBookingId}`;

        const deleted = await RedisService.delete(key);

        if (deleted) {
            console.log(
                `🗑️ Temp booking ${tempBookingId} deleted from Redis`
            );
        }

        return deleted;
    }

}

module.exports = new PaymentService();
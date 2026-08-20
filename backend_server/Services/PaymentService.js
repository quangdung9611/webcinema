const db = require("../Config/db");
const RedisService = require("./RedisService");
const crypto = require("crypto");


/*=========================================================
    CONFIG
=========================================================*/

const TEMP_BOOKING_TTL = 300; // 5 phút


/*=========================================================
    GENERATE TEMP BOOKING ID
=========================================================*/

const generateTempBookingId = () => {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
};


/*=========================================================
    PAYMENT SERVICE
=========================================================*/

class PaymentService {


    /*=========================================================
        1. PROCESS ORDER
        - Lấy thông tin phòng
        - Kiểm tra ghế
        - Lưu booking tạm vào Redis
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
            LẤY ROOM ID + ROOM NAME + CINEMA ID
        =====================================================*/

        const [rows] = await db.execute(
            `
            SELECT
                sh.room_id,
                sh.cinema_id,
                r.room_name
            FROM showtimes sh
            LEFT JOIN rooms r
                ON sh.room_id = r.room_id
            WHERE sh.showtime_id = ?
            `,
            [showtimeId]
        );


        if (!rows.length) {
            throw new Error("Không tìm thấy suất chiếu");
        }


        const room_id = rows[0].room_id;
        const cinema_id = rows[0].cinema_id;
        const roomName = rows[0].room_name;


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

            roomName,

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
        2. COMMIT TO DATABASE
        - Khi OTP xác thực thành công
        - Tạo booking
        - Tạo ticket
        - Lưu đồ ăn
        - Cộng điểm
    =========================================================*/

    async commitToDatabase(connection, tempBookingId) {

        const key = `temp:${tempBookingId}`;


        let tempData = await RedisService.get(key);


        if (!tempData) {
            throw new Error(
                "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            );
        }


        /*=====================================================
            HỖ TRỢ REDIS STRING / OBJECT
        =====================================================*/

        if (typeof tempData === "string") {
            tempData = JSON.parse(tempData);
        }


        const {

            userId,

            showtimeId,

            room_id,

            roomName,

            cinema_id,

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
            THÊM GHẾ + TẠO TICKET
        =====================================================*/

        for (const seat of selectedSeats) {

            /*-------------------------------------------------
                THÊM BOOKING DETAIL
            -------------------------------------------------*/

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


            /*-------------------------------------------------
                TẠO MÃ VÉ
            -------------------------------------------------*/

            const ticketCode =
                `TIC-${bookingId}-${seat.seat_id}-${Date.now()}`;


            /*-------------------------------------------------
                INSERT TICKET
            -------------------------------------------------*/

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

        }


        /*=====================================================
            THÊM ĐỒ ĂN
        =====================================================*/

        if (
            selectedFoods &&
            selectedFoods.length > 0
        ) {

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

            }

        }


        /*=====================================================
            CỘNG ĐIỂM
        =====================================================*/

        let earnedPoints = 0;


        if (userId) {

            const points =
                Math.floor(totalAmount * 0.05);


            if (points > 0) {

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


                earnedPoints = points;

            }

        }


        /*=====================================================
            XÓA TEMP BOOKING KHỎI REDIS
        =====================================================*/

        await RedisService.delete(key);


        console.log(
            `✅ Booking ${bookingId} committed successfully`
        );


        /*=====================================================
            TRẢ VỀ TOÀN BỘ THÔNG TIN CẦN THIẾT

            QUAN TRỌNG:
            roomName được trả về ở đây để sau khi Redis bị xóa,
            BankAppController vẫn có dữ liệu gửi Email.
        =====================================================*/

        return {

            bookingId,

            memo,

            userId,

            showtimeId,

            room_id,

            roomName,

            cinema_id,

            totalAmount,

            customerEmail,

            customerName,

            customerPhone,

            movieTitle,

            cinemaName,

            startTime,

            selectedSeats,

            selectedFoods,

            earnedPoints

        };

    }


    /*=========================================================
        3. GET TEMP DATA
    =========================================================*/

    async getTempData(tempBookingId) {

        const key = `temp:${tempBookingId}`;


        let tempData =
            await RedisService.get(key);


        if (!tempData) {
            return null;
        }


        /*=====================================================
            HỖ TRỢ REDIS STRING / OBJECT
        =====================================================*/

        if (typeof tempData === "string") {

            try {

                tempData =
                    JSON.parse(tempData);

            } catch (error) {

                console.error(
                    "❌ Parse temp booking error:",
                    error
                );

                return null;

            }

        }


        return tempData;

    }


    /*=========================================================
        4. DELETE TEMP DATA
    =========================================================*/

    async deleteTempData(tempBookingId) {

        const key =
            `temp:${tempBookingId}`;


        const deleted =
            await RedisService.delete(key);


        if (deleted) {

            console.log(
                `🗑️ Temp booking ${tempBookingId} deleted from Redis`
            );

        }


        return deleted;

    }

}


module.exports = new PaymentService();
const db = require("../Config/db");
const RedisService = require("./RedisService");
const crypto = require("crypto");


/*=========================================================
    CONFIG
=========================================================*/

const TEMP_BOOKING_TTL = 300; // 5 phút
const SEAT_LOCK_TTL = 10 * 60; // 10 phút

const RATE_LIMIT_WINDOW = 300;
const MAX_OTP_ATTEMPTS = 5;


/*=========================================================
    GENERATE TEMP BOOKING ID
=========================================================*/

const generateTempBookingId = () => {
    return crypto
        .randomBytes(8)
        .toString("hex")
        .toUpperCase();
};


/*=========================================================
    PAYMENT SERVICE
=========================================================*/

class PaymentService {


    /*=========================================================
        1. PROCESS ORDER

        MỤC TIÊU:

        - Lấy thông tin suất chiếu
        - Xác nhận ghế đang thuộc Redis lock
        - Tạo temp booking
        - Lưu temp booking vào Redis

        QUAN TRỌNG:

        Không dùng SELECT từng ghế trong MySQL ở đây nữa.

        Redis mới là lớp bảo vệ realtime đầu tiên.
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
            startTime,

            // Owner của Redis seat lock
            ownerToken
        } = data;


        /*=====================================================
            VALIDATE
        =====================================================*/

        if (!showtimeId) {
            throw new Error(
                "showtimeId không hợp lệ"
            );
        }


        if (
            !selectedSeats ||
            !Array.isArray(selectedSeats) ||
            selectedSeats.length === 0
        ) {

            throw new Error(
                "Vui lòng chọn ít nhất một ghế"
            );
        }


        /*
         * Giới hạn giống frontend hiện tại:
         * tối đa 8 ghế.
         *
         * Đây chỉ là lớp bảo vệ backend.
         */

        if (selectedSeats.length > 8) {

            throw new Error(
                "Bạn chỉ được chọn tối đa 8 ghế"
            );
        }


        /*
         * ownerToken rất quan trọng.
         *
         * Nó phải giống token được dùng khi:
         *
         * Redis Seat Lock
         *
         * được tạo ở server.js.
         */

        if (!ownerToken) {

            throw new Error(
                "Không xác định được phiên giữ ghế. Vui lòng chọn ghế lại."
            );
        }


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

            throw new Error(
                "Không tìm thấy suất chiếu"
            );
        }


        const room_id =
            rows[0].room_id;

        const cinema_id =
            rows[0].cinema_id;

        const roomName =
            rows[0].room_name;


        /*=====================================================
            KIỂM TRA REDIS SEAT LOCK
        =====================================================*/

        /*
         * Kiểm tra tất cả ghế song song.
         *
         * Không làm:
         *
         * await seat 1
         * await seat 2
         * await seat 3
         *
         * vì sẽ chậm hơn.
         *
         * Thay vào đó:
         *
         * Promise.all()
         */

        const seatLockResults =
            await Promise.all(
                selectedSeats.map(
                    async (seat) => {

                        const lock =
                            await RedisService.getSeatLock(
                                showtimeId,
                                seat.seat_id
                            );

                        return {
                            seat,
                            lock
                        };
                    }
                )
            );


        /*=====================================================
            XÁC NHẬN OWNER
        =====================================================*/

        for (const item of seatLockResults) {

            const {
                seat,
                lock
            } = item;


            /*
             * Không có Redis lock
             */

            if (
                !lock.locked
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} không còn được giữ. Vui lòng chọn lại ghế.`
                );
            }


            /*
             * Lock thuộc người khác
             */

            if (
                lock.ownerToken !==
                ownerToken
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} đang được người khác giữ. Vui lòng chọn ghế khác.`
                );
            }


            /*
             * Lock sắp hết hạn.
             *
             * Không bắt buộc phải chặn ở đây,
             * nhưng nếu TTL <= 0 thì chắc chắn không hợp lệ.
             */

            if (
                !lock.ttl ||
                lock.ttl <= 0
            ) {

                throw new Error(
                    `Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng chọn lại.`
                );
            }
        }


        /*=====================================================
            TẠO TEMP BOOKING
        =====================================================*/

        const tempBookingId =
            generateTempBookingId();


        const tempData = {

            tempBookingId,

            userId,

            showtimeId,

            room_id,

            roomName,

            cinema_id,

            totalAmount,

            couponId:
                couponId || null,

            selectedSeats,

            selectedFoods:
                selectedFoods || [],

            customerEmail,

            customerName,

            customerPhone,

            movieTitle,

            cinemaName,

            startTime,

            /*
             * Rất quan trọng:
             *
             * Lưu ownerToken cùng temp booking
             * để lúc commit có thể xác nhận
             * người thanh toán chính là người
             * đã giữ ghế.
             */

            ownerToken,

            status: "pending",

            createdAt:
                Date.now()
        };


        /*=====================================================
            LƯU TEMP BOOKING REDIS
        =====================================================*/

        const key =
            `temp:${tempBookingId}`;


        await RedisService.set(
            key,
            tempData,
            TEMP_BOOKING_TTL
        );


        console.log(
            `✅ Temp booking ${tempBookingId} saved (${TEMP_BOOKING_TTL}s)`
        );


        /*=====================================================
            RETURN
        =====================================================*/

        return {
            tempBookingId
        };
    }


    /*=========================================================
        2. COMMIT TO DATABASE

        MỤC TIÊU:

        - Lấy temp booking
        - Kiểm tra Redis seat lock lần cuối
        - Tạo booking
        - Tạo booking details
        - Tạo tickets
        - Thêm food
        - Cộng điểm

        QUAN TRỌNG:

        Đây là lớp bảo vệ thứ hai sau Redis.

        Redis:
            realtime contention

        MySQL:
            dữ liệu lâu dài
    =========================================================*/

    async commitToDatabase(
        connection,
        tempBookingId
    ) {

        const key =
            `temp:${tempBookingId}`;


        /*=====================================================
            LẤY TEMP BOOKING
        =====================================================*/

        let tempData =
            await RedisService.get(key);


        if (!tempData) {

            throw new Error(
                "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            );
        }


        /*=====================================================
            PARSE REDIS DATA
        =====================================================*/

        if (
            typeof tempData ===
            "string"
        ) {

            try {

                tempData =
                    JSON.parse(
                        tempData
                    );

            } catch (error) {

                console.error(
                    "❌ Parse temp booking error:",
                    error
                );

                throw new Error(
                    "Dữ liệu đặt vé không hợp lệ."
                );
            }
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

            startTime,

            ownerToken

        } = tempData;


        /*=====================================================
            VALIDATE TEMP DATA
        =====================================================*/

        if (
            !ownerToken
        ) {

            throw new Error(
                "Phiên giữ ghế không hợp lệ. Vui lòng chọn ghế lại."
            );
        }


        if (
            !selectedSeats ||
            !Array.isArray(selectedSeats) ||
            selectedSeats.length === 0
        ) {

            throw new Error(
                "Không tìm thấy ghế trong phiên đặt vé."
            );
        }


        /*=====================================================
            KIỂM TRA REDIS LOCK LẦN CUỐI

            Đây là bước CỰC KỲ QUAN TRỌNG.

            Ví dụ:

            User A giữ A1
                ↓
            chờ OTP
                ↓
            lock hết hạn
                ↓
            User B lấy A1

            Nếu A vẫn được thanh toán
            thì sẽ xảy ra race condition.

            Vì vậy khi commit:

            A phải còn sở hữu Redis lock.
        =====================================================*/

        const finalSeatLocks =
            await Promise.all(
                selectedSeats.map(
                    async (seat) => {

                        const lock =
                            await RedisService.getSeatLock(
                                showtimeId,
                                seat.seat_id
                            );

                        return {
                            seat,
                            lock
                        };
                    }
                )
            );


        for (
            const item
            of finalSeatLocks
        ) {

            const {
                seat,
                lock
            } = item;


            if (
                !lock.locked
            ) {

                throw new Error(
                    `Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng đặt lại.`
                );
            }


            if (
                lock.ownerToken !==
                ownerToken
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} không còn thuộc phiên đặt vé này.`
                );
            }


            if (
                lock.ttl <= 0
            ) {

                throw new Error(
                    `Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng đặt lại.`
                );
            }
        }


        /*=====================================================
            KIỂM TRA MYSQL LẦN CUỐI

            Đây là lớp bảo vệ durable.

            Redis không thay thế MySQL.

            MySQL vẫn phải xác nhận ghế chưa
            được booking Completed trước đó.
        =====================================================*/

        for (
            const seat
            of selectedSeats
        ) {

            const [
                existing
            ] = await connection.execute(
                `
                SELECT
                    t.ticket_id
                FROM tickets t
                INNER JOIN bookings b
                    ON t.booking_id = b.booking_id
                WHERE
                    t.showtime_id = ?
                    AND t.cinema_id = ?
                    AND t.room_id = ?
                    AND t.seat_id = ?
                    AND b.status = 'Completed'
                LIMIT 1
                `,
                [
                    showtimeId,
                    cinema_id,
                    room_id,
                    seat.seat_id
                ]
            );


            if (
                existing.length > 0
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`
                );
            }
        }


        /*=====================================================
            TẠO BOOKING
        =====================================================*/

        const memo =
            `DUNG${Date.now()}`;


        const [
            bookingResult
        ] = await connection.execute(
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


        const bookingId =
            bookingResult.insertId;


        /*=====================================================
            THÊM GHẾ + TICKET
        =====================================================*/

        for (
            const seat
            of selectedSeats
        ) {

            /*=================================================
                BOOKING DETAIL
            =================================================*/

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


            /*=================================================
                TICKET CODE
            =================================================*/

            const ticketCode =
                `TIC-${bookingId}-${seat.seat_id}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;


            /*=================================================
                INSERT TICKET
            =================================================*/

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
            Array.isArray(selectedFoods) &&
            selectedFoods.length > 0
        ) {

            for (
                const food
                of selectedFoods
            ) {

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
                Math.floor(
                    totalAmount * 0.05
                );


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


                earnedPoints =
                    points;
            }
        }


        /*=====================================================
            XÓA TEMP BOOKING

            Chỉ xóa sau khi toàn bộ INSERT
            trong connection đã thành công.

            Transaction commit/rollback vẫn do
            caller quản lý.
        =====================================================*/

        await RedisService.delete(
            key
        );


        console.log(
            `✅ Booking ${bookingId} committed successfully`
        );


        /*=====================================================
            TRẢ VỀ DỮ LIỆU
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

            earnedPoints,

            ownerToken
        };
    }


    /*=========================================================
        3. RELEASE SEAT LOCKS

        Dùng sau khi booking thành công.

        Hàm này được gọi ở controller/service
        sau khi transaction COMMIT thành công.
    =========================================================*/

    async releaseBookingSeatLocks(
        showtimeId,
        selectedSeats,
        ownerToken
    ) {

        if (
            !showtimeId ||
            !selectedSeats ||
            !Array.isArray(selectedSeats) ||
            !ownerToken
        ) {

            return 0;
        }


        let releasedCount = 0;


        for (
            const seat
            of selectedSeats
        ) {

            const released =
                await RedisService.releaseSeatLock(
                    showtimeId,
                    seat.seat_id,
                    ownerToken
                );


            if (released) {
                releasedCount++;
            }
        }


        console.log(
            `🔓 [PAYMENT] Released ${releasedCount}/${selectedSeats.length} seat locks`
        );


        return releasedCount;
    }


    /*=========================================================
        4. GET TEMP DATA
    =========================================================*/

    async getTempData(
        tempBookingId
    ) {

        const key =
            `temp:${tempBookingId}`;


        let tempData =
            await RedisService.get(
                key
            );


        if (!tempData) {
            return null;
        }


        if (
            typeof tempData ===
            "string"
        ) {

            try {

                tempData =
                    JSON.parse(
                        tempData
                    );

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
        5. DELETE TEMP DATA
    =========================================================*/

    async deleteTempData(
        tempBookingId
    ) {

        const key =
            `temp:${tempBookingId}`;


        const deleted =
            await RedisService.delete(
                key
            );


        if (deleted) {

            console.log(
                `🗑️ Temp booking ${tempBookingId} deleted from Redis`
            );
        }


        return deleted;
    }


    /*=========================================================
        6. CHECK TEMP BOOKING TTL
    =========================================================*/

    async checkTempBookingTTL(
        tempBookingId
    ) {

        const key =
            `temp:${tempBookingId}`;


        const ttl =
            await RedisService.getTTL(
                key
            );


        const data =
            await RedisService.get(
                key
            );


        return {

            success: true,

            data: {

                exists:
                    !!data,

                expiresIn:
                    ttl > 0
                        ? ttl
                        : 0,

                isExpired:
                    ttl <= 0 ||
                    !data
            }
        };
    }


    /*=========================================================
        7. RESEND OTP PAYMENT
    =========================================================*/

    async resendOtpPayment(
        email,
        tempBookingId
    ) {

        if (
            !email?.trim()
        ) {

            throw {
                statusCode: 400,
                field: "email",
                message:
                    "Email không được để trống"
            };
        }


        /*=====================================================
            CHECK TEMP BOOKING
        =====================================================*/

        const key =
            `temp:${tempBookingId}`;


        const tempData =
            await RedisService.get(
                key
            );


        if (!tempData) {

            throw {
                statusCode: 404,
                message:
                    "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            };
        }


        /*=====================================================
            RATE LIMIT
        =====================================================*/

        const rateLimit =
            await RedisService.checkRateLimit(
                email,
                "payment-resend",
                3,
                RATE_LIMIT_WINDOW
            );


        if (!rateLimit.allowed) {

            throw {

                statusCode: 429,

                message:
                    `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,

                data: {

                    remainingSeconds:
                        rateLimit.remainingSeconds ||
                        300,

                    maxAttempts: 3
                }
            };
        }


        /*=====================================================
            CREATE OTP
        =====================================================*/

        const OtpService =
            require("./OtpService");


        const otpResult =
            await OtpService.createOTP(
                email,
                OtpService.PURPOSE.PAYMENT
            );


        /*=====================================================
            UPDATE TEMP BOOKING
        =====================================================*/

        const updatedData =
            typeof tempData ===
            "string"

                ? JSON.parse(tempData)

                : tempData;


        updatedData.otp =
            otpResult.otp;

        updatedData.otpCreatedAt =
            Date.now();


        /*
         * Lưu lại TTL 5 phút.
         *
         * ownerToken vẫn được giữ nguyên
         * vì updatedData là object cũ.
         */

        await RedisService.set(
            key,
            updatedData,
            TEMP_BOOKING_TTL
        );


        /*=====================================================
            SEND EMAIL
        =====================================================*/

        const MailService =
            require("./MailService");


        setImmediate(() => {

            MailService
                .sendPaymentOTP(
                    email,
                    otpResult.otp,
                    updatedData.customerName,
                    updatedData.totalAmount
                )

                .then(() => {

                    console.log(
                        `✅ Payment OTP email sent to ${email}`
                    );
                })

                .catch((err) => {

                    console.error(
                        `❌ Payment OTP email failed: ${err.message}`
                    );
                });
        });


        /*=====================================================
            OTP TTL
        =====================================================*/

        const otpKey =
            `otp:${email}:${OtpService.PURPOSE.PAYMENT}`;


        const ttl =
            await RedisService.getTTL(
                otpKey
            );


        return {

            success: true,

            message:
                "Mã OTP đã được gửi lại tới email.",

            data: {

                expiresIn:
                    ttl > 0
                        ? ttl
                        : 300
            }
        };
    }
}


/*===========================================================
    EXPORT
===========================================================*/

module.exports =
    new PaymentService();
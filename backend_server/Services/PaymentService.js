const db = require("../Config/db");
const CacheService = require("./CacheService");
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


        if (selectedSeats.length > 8) {

            throw new Error(
                "Bạn chỉ được chọn tối đa 8 ghế"
            );
        }


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
            KIỂM TRA CACHE SEAT LOCK
        =====================================================*/

        const seatLockResults =
            await Promise.all(
                selectedSeats.map(
                    async (seat) => {

                        const lock =
                            await CacheService.getSeatLock(
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


            if (
                !lock.locked
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} không còn được giữ. Vui lòng chọn lại ghế.`
                );
            }


            if (
                lock.ownerToken !==
                ownerToken
            ) {

                throw new Error(
                    `Ghế ${seat.seat_row}${seat.seat_number} đang được người khác giữ. Vui lòng chọn ghế khác.`
                );
            }


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

            ownerToken,

            status: "pending",

            createdAt:
                Date.now()
        };


        /*=====================================================
            LƯU TEMP BOOKING CACHE
        =====================================================*/

        const key =
            `temp:${tempBookingId}`;


        await CacheService.set(
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
            await CacheService.get(key);


        if (!tempData) {

            throw new Error(
                "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            );
        }


        /*=====================================================
            PARSE CACHE DATA
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
            KIỂM TRA CACHE LOCK LẦN CUỐI
        =====================================================*/

        const finalSeatLocks =
            await Promise.all(
                selectedSeats.map(
                    async (seat) => {

                        const lock =
                            await CacheService.getSeatLock(
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
        =====================================================*/

        await CacheService.delete(
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
                await CacheService.releaseSeatLock(
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
            await CacheService.get(
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
            await CacheService.delete(
                key
            );


        if (deleted) {

            console.log(
                `🗑️ Temp booking ${tempBookingId} deleted from Cache`
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
            await CacheService.getTTL(
                key
            );


        const data =
            await CacheService.get(
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
        7. RESEND OTP PAYMENT - 🔥 SỬA DÙNG deleteOTPByEmailAndPurpose
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
            await CacheService.get(
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
            await CacheService.checkRateLimit(
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
            🔥 ĐÁNH DẤU OTP CŨ ĐÃ SỬ DỤNG
        =====================================================*/

        await CacheService.deleteOTPByEmailAndPurpose(
            email,
            OtpService.PURPOSE.PAYMENT
        );


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


        await CacheService.set(
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
            await CacheService.getTTL(
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
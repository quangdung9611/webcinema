const db = require('../Config/db');

// =========================================================
// MAIL SERVICE
// =========================================================

const MailServiceTicket =
    require('../Services/MailServiceTicket');

const PaymentController = {

    // =====================================================
    // 1. PROCESS ORDER
    // =====================================================

    processOrder: async (req, res) => {

        const {

            userId,
            showtimeId,
            totalAmount,
            couponId,
            selectedSeats,
            selectedFoods,
            customerEmail

        } = req.body;

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            // =============================================
            // VALIDATE
            // =============================================

            if (
                !showtimeId ||
                !selectedSeats ||
                selectedSeats.length === 0
            ) {

                throw new Error(
                    'Thiếu thông tin ghế hoặc suất chiếu'
                );

            }

            // =============================================
            // GET SHOWTIME
            // =============================================

            const [showtimeRows] =
                await connection.execute(

                    `
                        SELECT
                            room_id,
                            cinema_id
                        FROM showtimes
                        WHERE showtime_id = ?
                    `,

                    [showtimeId]

                );

            if (
                showtimeRows.length === 0
            ) {

                throw new Error(
                    'Suất chiếu không tồn tại'
                );

            }

            const {

                room_id,
                cinema_id

            } = showtimeRows[0];

            // =============================================
            // CHECK SEATS
            // =============================================

            for (let seat of selectedSeats) {

                const [seatRows] =
                    await connection.execute(

                        `
                            SELECT
                                seat_status
                            FROM seats
                            WHERE seat_id = ?
                        `,

                        [seat.seat_id]

                    );

                if (
                    seatRows.length === 0
                ) {

                    throw new Error(
                        `Ghế không tồn tại`
                    );

                }

                const currentStatus =
                    String(
                        seatRows[0].seat_status
                    ).toLowerCase();

                if (
                    currentStatus === 'booked' ||
                    currentStatus === 'reserved'
                ) {

                    throw new Error(
                        `Ghế ${seat.seat_row}${seat.seat_number} đã được giữ`
                    );

                }

            }

            // =============================================
            // UPDATE SEATS RESERVED
            // =============================================

            for (let seat of selectedSeats) {

                await connection.execute(

                    `
                        UPDATE seats
                        SET seat_status = 'Reserved'
                        WHERE seat_id = ?
                    `,

                    [seat.seat_id]

                );

            }

            // =============================================
            // TIME
            // =============================================

            const currentTimeVN =
                new Date().toLocaleString(

                    "sv-SE",

                    {
                        timeZone:
                            "Asia/Ho_Chi_Minh"
                    }

                );

            // =============================================
            // MEMO
            // =============================================

            const memo =
                `DUNG${Date.now()}`;

            // =============================================
            // CREATE BOOKING
            // =============================================

            const [bookingResult] =
                await connection.execute(

                    `
                        INSERT INTO bookings (

                            user_id,
                            showtime_id,
                            total_amount,
                            coupon_id,
                            status,
                            booking_date,
                            memo

                        )

                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,

                    [

                        userId,
                        showtimeId,
                        totalAmount,
                        couponId || null,
                        'Pending',
                        currentTimeVN,
                        memo

                    ]

                );

            const bookingId =
                bookingResult.insertId;

            // =============================================
            // INSERT SEATS
            // =============================================

            if (
                selectedSeats?.length > 0
            ) {

                for (let seat of selectedSeats) {

                    // =====================================
                    // BOOKING DETAILS
                    // =====================================

                    await connection.execute(

                        `
                            INSERT INTO booking_details (

                                booking_id,
                                seat_id,
                                price,
                                item_name,
                                quantity

                            )

                            VALUES (?, ?, ?, ?, ?)
                        `,

                        [

                            bookingId,
                            seat.seat_id,
                            seat.price,
                            `Ghế ${seat.seat_row}${seat.seat_number}`,
                            1

                        ]

                    );

                    // =====================================
                    // TEMP CODE
                    // =====================================

                    const tempCode =
                        `WAIT-${Date.now()}-${seat.seat_id}`;

                    // =====================================
                    // INSERT TICKETS
                    // =====================================

                    await connection.execute(

                        `
                            INSERT INTO tickets (

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

                            VALUES (

                                ?, ?, ?, ?, ?, ?, ?, 

                                'Reserved',
                                'Valid',
                                ?

                            )
                        `,

                        [

                            bookingId,
                            showtimeId,
                            room_id,
                            cinema_id,
                            seat.seat_id,
                            tempCode,
                            seat.price,
                            currentTimeVN

                        ]

                    );

                }

            }

            // =============================================
            // INSERT FOODS
            // =============================================

            if (
                selectedFoods?.length > 0
            ) {

                for (let food of selectedFoods) {

                    await connection.execute(

                        `
                            INSERT INTO booking_details (

                                booking_id,
                                product_id,
                                item_name,
                                quantity,
                                price

                            )

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

            }

            // =============================================
            // COMMIT
            // =============================================

            await connection.commit();

            // =============================================
            // SEND OTP
            // =============================================

            try {

                const otp =
                    Math.floor(

                        100000 +
                        Math.random() * 900000

                    ).toString();

                console.log(
                    '🔥 START SEND OTP'
                );

                console.log({
                    customerEmail,
                    otp,
                    bookingId
                });

                await MailServiceTicket.sendOTP(

                    customerEmail,
                    otp,
                    bookingId

                );

                console.log(
                    '✅ OTP MAIL SENT'
                );

            }
            catch (mailErr) {

                console.log(
                    '❌ OTP MAIL ERROR'
                );

                console.log(mailErr);

            }

            // =============================================
            // RESPONSE
            // =============================================

            res.status(200).json({

                success: true,

                bookingId,

                memo

            });

        }
        catch (error) {

            if (connection) {

                await connection.rollback();

            }

            console.log(
                '❌ PROCESS ORDER ERROR'
            );

            console.log(error);

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Lỗi giữ ghế!"

            });

        }
        finally {

            connection.release();

        }

    },

    // =====================================================
    // ADD POINTS
    // =====================================================

    addPoints: async (

        bookingId,
        userId,
        connection

    ) => {

        const [details] =
            await connection.execute(

                `
                    SELECT
                        price,
                        quantity,
                        seat_id
                    FROM booking_details
                    WHERE booking_id = ?
                `,

                [bookingId]

            );

        let totalPoints = 0;

        details.forEach(item => {

            const lineTotal =

                Number(item.price || 0) *
                Number(item.quantity || 0);

            totalPoints += item.seat_id

                ? Math.floor(lineTotal * 0.05)

                : Math.floor(lineTotal * 0.03);

        });

        if (totalPoints > 0) {

            await connection.execute(

                `
                    UPDATE users
                    SET points = points + ?
                    WHERE user_id = ?
                `,

                [
                    totalPoints,
                    userId
                ]

            );

            console.log(

                `✨ [DŨNG] +${totalPoints} points cho User #${userId}`

            );

        }

    },

    // =====================================================
    // MOMO COMPLETION
    // =====================================================

    executeMomoCompletion: async (

        bookingId,
        connection

    ) => {

        const [current] =
            await connection.execute(

                `
                    SELECT
                        user_id,
                        status
                    FROM bookings
                    WHERE booking_id = ?
                `,

                [bookingId]

            );

        if (

            current.length === 0 ||

            String(
                current[0].status
            ).toLowerCase() === 'completed'

        ) return;

        const updateTimeVN =
            new Date().toLocaleString(

                "sv-SE",

                {
                    timeZone:
                        "Asia/Ho_Chi_Minh"
                }

            );

        await connection.execute(

            `
                UPDATE bookings
                SET status = 'Completed'
                WHERE booking_id = ?
            `,

            [bookingId]

        );

        await connection.execute(

            `
                UPDATE tickets

                SET

                    seat_status = 'Booked',

                    ticket_code = REPLACE(
                        ticket_code,
                        'WAIT-',
                        'TIC-'
                    ),

                    updated_at = ?

                WHERE booking_id = ?
            `,

            [
                updateTimeVN,
                bookingId
            ]

        );

        await connection.execute(

            `
                UPDATE seats s

                JOIN booking_details bd
                ON s.seat_id = bd.seat_id

                SET s.seat_status = 'Booked'

                WHERE bd.booking_id = ?
            `,

            [bookingId]

        );

        await PaymentController.addPoints(

            bookingId,
            current[0].user_id,
            connection

        );

    },

    // =====================================================
    // BANK COMPLETION
    // =====================================================

    executeBankCompletion: async (

        bookingId,
        connection

    ) => {

        const [current] =
            await connection.execute(

                `
                    SELECT
                        user_id,
                        status
                    FROM bookings
                    WHERE booking_id = ?
                `,

                [bookingId]

            );

        if (

            current.length === 0 ||

            String(
                current[0].status
            ).toLowerCase() === 'completed'

        ) return;

        const updateTimeVN =
            new Date().toLocaleString(

                "sv-SE",

                {
                    timeZone:
                        "Asia/Ho_Chi_Minh"
                }

            );

        await connection.execute(

            `
                UPDATE bookings
                SET status = 'Completed'
                WHERE booking_id = ?
            `,

            [bookingId]

        );

        await connection.execute(

            `
                UPDATE tickets

                SET

                    seat_status = 'Booked',

                    ticket_code = REPLACE(
                        ticket_code,
                        'WAIT-',
                        'TIC-'
                    ),

                    updated_at = ?

                WHERE booking_id = ?
            `,

            [
                updateTimeVN,
                bookingId
            ]

        );

        await connection.execute(

            `
                UPDATE seats s

                JOIN booking_details bd
                ON s.seat_id = bd.seat_id

                SET s.seat_status = 'Booked'

                WHERE bd.booking_id = ?
            `,

            [bookingId]

        );

        await PaymentController.addPoints(

            bookingId,
            current[0].user_id,
            connection

        );

    },

    // =====================================================
    // COMPLETE PAYMENT
    // =====================================================

    completePayment: async (req, res) => {

        const { bookingId } =
            req.body;

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            await PaymentController
                .executeBankCompletion(

                    bookingId,
                    connection

                );

            await connection.commit();

            res.json({
                success: true
            });

        }
        catch (error) {

            if (connection) {

                await connection.rollback();

            }

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }
        finally {

            connection.release();

        }

    },

    // =====================================================
    // MOMO CALLBACK
    // =====================================================

    momoCallback: async (req, res) => {

        const {

            orderId,
            resultCode

        } = req.body;

        if (resultCode === 0) {

            const connection =
                await db.getConnection();

            try {

                await connection.beginTransaction();

                await PaymentController
                    .executeMomoCompletion(

                        orderId,
                        connection

                    );

                await connection.commit();

            }
            catch (err) {

                if (connection) {

                    await connection.rollback();

                }

                console.log(err);

            }
            finally {

                connection.release();

            }

        }

        return res
            .status(204)
            .send();

    }

};

module.exports = PaymentController;
const db = require('../Config/db');

const mailService =
    require('../Services/MailServiceTicket');

// =========================================================
// OTP STORAGE
// =========================================================

let otpStorage = {};

// =========================================================
// CONTROLLER
// =========================================================

const BankAppController = {

    // =====================================================
    // 1. SEND OTP
    // =====================================================

    sendOTP: async (req, res) => {

        const {
            email,
            bookingId
        } = req.body;

        // =================================================
        // VALIDATE
        // =================================================

        if (!email || !bookingId) {

            return res.status(400).json({

                success: false,

                message:
                    "Thiếu thông tin!"

            });

        }

        // =================================================
        // CHỐNG SPAM OTP 30S
        // =================================================

        if (otpStorage[email]) {

            const lastSent =

                otpStorage[email].expires -

                (5 * 60 * 1000);

            if (

                Date.now() - lastSent < 30000

            ) {

                return res.json({

                    success: true,

                    message:
                        "Mã đã được gửi, vui lòng kiểm tra mail!"

                });

            }

        }

        // =================================================
        // GENERATE OTP
        // =================================================

        const otp = Math.floor(

            100000 +
            Math.random() * 900000

        ).toString();

        otpStorage[email] = {

            otp,

            bookingId,

            expires:

                Date.now() +

                5 * 60 * 1000

        };

        // =================================================
        // DEBUG
        // =================================================

        console.log(
            '🔥 START SEND OTP'
        );

        console.log({

            email,
            otp,
            bookingId

        });

        // =================================================
        // RESPONSE FAST
        // =================================================

        res.json({

            success: true,

            message:
                "Mã OTP đang được gửi!"

        });

        // =================================================
        // SEND MAIL
        // =================================================

        try {

            const info =
                await mailService.sendOTP(

                    email,
                    otp,
                    bookingId

                );

            console.log(
                '✅ OTP SENT SUCCESS'
            );

            console.log(info);

        }
        catch (err) {

            console.log(
                '❌ SEND OTP ERROR'
            );

            console.log(err);

        }

    },

    // =====================================================
    // 2. VERIFY OTP
    // =====================================================

    verifyOTP: async (req, res) => {

        const {
            email,
            otp,
            bookingId
        } = req.body;

        const record =
            otpStorage[email];

        // =================================================
        // CHECK OTP
        // =================================================

        if (

            !record ||

            record.otp != otp ||

            record.expires < Date.now()

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Mã OTP không đúng hoặc đã hết hạn!"

            });

        }

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            // =============================================
            // UPDATE BOOKING
            // =============================================

            await connection.execute(

                `
                    UPDATE bookings

                    SET status = 'Completed'

                    WHERE booking_id = ?
                `,

                [bookingId]

            );

            // =============================================
            // UPDATE TICKETS
            // =============================================

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

                        updated_at = NOW()

                    WHERE booking_id = ?

                    AND seat_status = 'Reserved'
                `,

                [bookingId]

            );

            // =============================================
            // GET ORDER
            // =============================================

            const [orderRows] =
                await connection.query(

                    `
                        SELECT

                            b.booking_id,

                            b.user_id,

                            u.full_name,

                            u.email,

                            m.title AS movieTitle,

                            m.poster_url AS moviePoster,

                            c.cinema_name AS cinemaName,

                            r.room_name AS roomName,

                            DATE_FORMAT(

                                s.start_time,

                                '%Y-%m-%d %H:%i:%s'

                            ) as start_time_raw,

                            GROUP_CONCAT(

                                DISTINCT bd.item_name

                                SEPARATOR ', '

                            ) AS seatLabel

                        FROM bookings b

                        LEFT JOIN users u
                        ON b.user_id = u.user_id

                        LEFT JOIN showtimes s
                        ON b.showtime_id = s.showtime_id

                        LEFT JOIN movies m
                        ON s.movie_id = m.movie_id

                        LEFT JOIN cinemas c
                        ON s.cinema_id = c.cinema_id

                        LEFT JOIN rooms r
                        ON s.room_id = r.room_id

                        LEFT JOIN booking_details bd
                        ON b.booking_id = bd.booking_id

                        WHERE b.booking_id = ?

                        GROUP BY b.booking_id
                    `,

                    [bookingId]

                );

            const order =
                orderRows[0];

            if (!order) {

                throw new Error(

                    "Không tìm thấy dữ liệu đơn hàng!"

                );

            }

            // =============================================
            // CALCULATE POINTS
            // =============================================

            const [details] =
                await connection.execute(

                    `
                        SELECT

                            bd.price,

                            bd.quantity,

                            s.seat_type

                        FROM booking_details bd

                        LEFT JOIN seats s
                        ON bd.seat_id = s.seat_id

                        WHERE bd.booking_id = ?
                    `,

                    [bookingId]

                );

            let totalEarnedPoints = 0;

            details.forEach(item => {

                const itemTotal =

                    Number(item.price) *

                    Number(item.quantity);

                const type =

                    String(
                        item.seat_type || ''
                    ).toUpperCase();

                let rate =

                    (type === 'VIP')

                        ? 0.10

                        : (

                            ['DOUBLE', 'SWEETBOX', 'COUPLE']

                            .includes(type)

                        )

                            ? 0.07

                            : 0.05;

                totalEarnedPoints +=

                    Math.floor(

                        itemTotal * rate

                    );

            });

            // =============================================
            // UPDATE USER POINTS
            // =============================================

            if (totalEarnedPoints > 0) {

                await connection.execute(

                    `
                        UPDATE users

                        SET points = points + ?

                        WHERE user_id = ?
                    `,

                    [

                        totalEarnedPoints,

                        order.user_id

                    ]

                );

            }

            // =============================================
            // COMMIT
            // =============================================

            await connection.commit();

            // =============================================
            // DELETE OTP
            // =============================================

            delete otpStorage[email];

            // =============================================
            // GET FOODS
            // =============================================

            const [foodRows] =
                await connection.query(

                    `
                        SELECT

                            item_name,

                            quantity

                        FROM booking_details

                        WHERE booking_id = ?

                        AND seat_id IS NULL
                    `,

                    [bookingId]

                );

            const foodString =

                foodRows.map(

                    f =>

                        `${f.item_name} (x${f.quantity})`

                ).join(', ')

                || 'Không có';

            // =============================================
            // SEND TICKET MAIL
            // =============================================

            try {

                await mailService.sendTicketEmail(

                    email,

                    {

                        bookingId:
                            order.booking_id,

                        customerName:
                            order.full_name,

                        movieTitle:
                            order.movieTitle,

                        moviePoster:
                            order.moviePoster,

                        cinemaName:
                            order.cinemaName,

                        startTime:
                            order.start_time_raw
                                .split(' ')[1]
                                .substring(0, 5),

                        selectedDate:
                            order.start_time_raw
                                .split(' ')[0]
                                .split('-')
                                .reverse()
                                .join('/'),

                        seatLabel:
                            order.seatLabel,

                        selectedFoods:
                            foodString

                    }

                );

                console.log(
                    '✅ TICKET MAIL SENT SUCCESS'
                );

            }
            catch (e) {

                console.log(
                    '❌ TICKET MAIL ERROR'
                );

                console.log(e);

            }

            // =============================================
            // RESPONSE
            // =============================================

            res.json({

                success: true,

                message:
                    "Thanh toán thành công!",

                data: {

                    orderId:
                        order.booking_id

                }

            });

        }
        catch (error) {

            if (connection) {

                await connection.rollback();

            }

            console.log(
                '❌ VERIFY OTP ERROR'
            );

            console.log(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }
        finally {

            if (connection) {

                connection.release();

            }

        }

    },

    // =====================================================
    // 3. CANCEL TIMEOUT
    // =====================================================

    cancelBookingTimeout: async (req, res) => {

        const {
            bookingId,
            email
        } = req.body;

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            // =============================================
            // CANCEL BOOKING
            // =============================================

            await connection.execute(

                `
                    UPDATE bookings

                    SET status = 'Cancelled'

                    WHERE booking_id = ?
                `,

                [bookingId]

            );

            // =============================================
            // RELEASE TICKETS
            // =============================================

            await connection.execute(

                `
                    UPDATE tickets

                    SET

                        seat_status = 'Available',

                        booking_id = NULL

                    WHERE booking_id = ?
                `,

                [bookingId]

            );

            await connection.commit();

            // =============================================
            // DELETE OTP
            // =============================================

            if (email) {

                delete otpStorage[email];

            }

            res.json({

                success: true,

                message:
                    "Hết thời gian thanh toán, ghế đã được giải phóng."

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

            if (connection) {

                connection.release();

            }

        }

    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = BankAppController;
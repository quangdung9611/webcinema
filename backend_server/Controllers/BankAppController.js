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

        try {

            // =================================================
            // GENERATE OTP
            // =================================================

            const otp = Math.floor(

                100000 +
                Math.random() * 900000

            ).toString();

            // =================================================
            // SAVE OTP
            // =================================================

            otpStorage[email] = {

                otp,

                bookingId,

                expires:
                    Date.now() + 5 * 60 * 1000

            };

            console.log(
                '🔥 START SEND OTP'
            );

            console.log({

                email,
                otp,
                bookingId

            });

            // =================================================
            // SEND MAIL
            // =================================================

            await mailService.sendOTP(

                email,
                otp,
                bookingId

            );

            console.log(
                '✅ OTP SENT SUCCESS'
            );

            // =================================================
            // RESPONSE
            // =================================================

            return res.json({

                success: true,

                message:
                    "Mã OTP đã được gửi!"

            });

        }
        catch (err) {

            console.log(
                '❌ SEND OTP ERROR'
            );

            console.log(err);

            return res.status(500).json({

                success: false,

                message:
                    "Không gửi được OTP!"

            });

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

            record.bookingId != bookingId ||

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
            // GET BOOKING
            // =============================================

            const [bookingRows] =
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
                bookingRows.length === 0
            ) {

                throw new Error(
                    'Không tìm thấy đơn hàng!'
                );

            }

            // =============================================
            // CHECK COMPLETED
            // =============================================

            if (

                String(
                    bookingRows[0].status
                ).toLowerCase() === 'completed'

            ) {

                return res.json({

                    success: true,

                    message:
                        'Đơn hàng đã thanh toán!'

                });

            }

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
            // UPDATE SEATS
            // =============================================

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

            // =============================================
            // GET ORDER INFO
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
                                DISTINCT CASE
                                    WHEN bd.seat_id IS NOT NULL
                                    THEN bd.item_name
                                END
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
            // ADD USER POINTS
            // =============================================

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

                        roomName:
                            order.roomName,

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

            return res.json({

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

            return res.status(500).json({

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

                    SET seat_status = 'Available'

                    WHERE booking_id = ?
                `,

                [bookingId]

            );

            // =============================================
            // RELEASE SEATS
            // =============================================

            await connection.execute(

                `
                    UPDATE seats s

                    JOIN booking_details bd
                    ON s.seat_id = bd.seat_id

                    SET s.seat_status = 'Available'

                    WHERE bd.booking_id = ?
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

            return res.json({

                success: true,

                message:
                    "Hết thời gian thanh toán, ghế đã được giải phóng."

            });

        }
        catch (error) {

            if (connection) {

                await connection.rollback();

            }

            console.log(
                '❌ CANCEL TIMEOUT ERROR'
            );

            console.log(error);

            return res.status(500).json({

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
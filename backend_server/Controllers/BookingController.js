const db = require('../Config/db');

const bookingService =
    require('../Services/BookingService');

const ticketService =
    require('../Services/TicketService');

const pointsService =
    require('../Services/PointsService');

/* =========================================================
    GET ALL BOOKINGS
========================================================= */

exports.getAllBookings = async (
    req,
    res
) => {

    try {

        const [rows] =
            await db.execute(`
                SELECT
                    b.booking_id,
                    DATE_FORMAT(
                        b.created_at,
                        '%d/%m/%Y %H:%i'
                    ) AS created_at,
                    b.total_amount,
                    b.status,
                    b.memo,
                    u.full_name AS customer_name,
                    u.email AS customer_email,
                    m.title AS movie_title
                FROM bookings b
                LEFT JOIN users u
                    ON b.user_id = u.user_id
                LEFT JOIN showtimes s
                    ON b.showtime_id =
                    s.showtime_id
                LEFT JOIN movies m
                    ON s.movie_id =
                    m.movie_id
                ORDER BY
                    b.booking_id DESC
            `);

        return res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                'Lỗi lấy danh sách booking'
        });

    }

};

/* =========================================================
    GET BOOKING DETAILS
========================================================= */

exports.getBookingDetails =
async (req, res) => {

    try {

        const { id } =
            req.params;

        const connection =
            await db.getConnection();

        const booking =
            await bookingService
                .getBookingDetail(
                    connection,
                    id
                );

        if (!booking) {

            connection.release();

            return res.status(404).json({
                success: false,
                message:
                    'Không tìm thấy booking'
            });

        }

        const tickets =
            await ticketService
                .getTicketsByBooking(
                    connection,
                    id
                );

        const foods =
            await bookingService
                .getFoodDetail(
                    connection,
                    id
                );

        connection.release();

        return res.json({

            success: true,

            booking,

            tickets,

            foods

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

/* =========================================================
    UPDATE BOOKING STATUS
========================================================= */

exports.updateBookingStatus =
async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const { id } =
            req.params;

        const { status } =
            req.body;

        await connection.beginTransaction();

        const booking =
            await bookingService
                .findBookingById(
                    connection,
                    id
                );

        if (!booking) {

            throw new Error(
                'Không tìm thấy booking'
            );

        }

        const oldStatus =
            booking.status;

        const newStatus =
            String(
                status || ''
            ).toUpperCase();

        /* =====================
           UPDATE STATUS
        ===================== */

        await connection.execute(
            `
            UPDATE bookings
            SET status = ?
            WHERE booking_id = ?
            `,
            [
                status,
                id
            ]
        );

        /* =====================
           COMPLETED
        ===================== */

        if (
            newStatus ===
            'COMPLETED'
        ) {

            await ticketService
                .bookTickets(
                    connection,
                    id
                );

            if (
                String(
                    oldStatus
                ).toUpperCase()
                !== 'COMPLETED'
            ) {

                const points =
                    await pointsService
                        .calculateBookingPoints(
                            connection,
                            id
                        );

                await pointsService
                    .addPointsToUser(
                        connection,
                        booking.user_id,
                        points
                    );

            }

        }

        /* =====================
           CANCELLED
        ===================== */

        if (
            newStatus ===
            'CANCELLED'
        ) {

            await ticketService
                .cancelTickets(
                    connection,
                    id
                );

        }

        await connection.commit();

        return res.json({

            success: true,

            message:
                `Đã cập nhật đơn #${id} thành ${status}`

        });

    } catch (error) {

        await connection.rollback();

        console.error(error);

        return res.status(500).json({

            success: false,
            message: error.message

        });

    } finally {

        connection.release();

    }

};

/* =========================================================
    DELETE BOOKING
========================================================= */

exports.deleteBooking =
async (req, res) => {

    try {

        const { id } =
            req.params;

        const [result] =
            await db.execute(
                `
                DELETE FROM bookings
                WHERE booking_id = ?
                `,
                [id]
            );

        if (
            !result.affectedRows
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Không tìm thấy booking'

            });

        }

        return res.json({

            success: true,

            message:
                'Xóa booking thành công'

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,
            message: error.message

        });

    }

};
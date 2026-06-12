const db = require('../Config/db');

/* =========================================================
    CREATE TICKETS
========================================================= */

exports.createTickets = async (
    connection,
    bookingId
) => {

    const [bookingInfo] =
        await connection.query(
            `
            SELECT
                b.showtime_id,
                s.room_id,
                s.cinema_id

            FROM bookings b

            JOIN showtimes s
                ON b.showtime_id =
                s.showtime_id

            WHERE b.booking_id = ?
            `,
            [bookingId]
        );

    if (!bookingInfo.length) {

        throw new Error(
            'Không tìm thấy booking.'
        );

    }

    const {
        showtime_id,
        room_id,
        cinema_id
    } = bookingInfo[0];

    const [details] =
        await connection.query(
            `
            SELECT
                seat_id,
                price

            FROM booking_details

            WHERE booking_id = ?
            AND seat_id IS NOT NULL
            `,
            [bookingId]
        );

    const ticketsData =
        details.map(item => [

            bookingId,

            showtime_id,

            room_id,

            cinema_id,

            item.seat_id,

            `WAIT-${bookingId}-${item.seat_id}-${Date.now()}`,

            item.price,

            'Reserved',

            'Valid'
        ]);

    if (ticketsData.length) {

        await connection.query(
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
                ticket_status
            )
            VALUES ?
            `,
            [ticketsData]
        );

    }

    return true;

};

/* =========================================================
    BOOK TICKETS
========================================================= */

exports.bookTickets = async (
    connection,
    bookingId
) => {

    await connection.execute(
        `
        UPDATE tickets

        SET
            seat_status = 'Booked',

            ticket_code =
                REPLACE(
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

};

/* =========================================================
    RELEASE TICKETS
========================================================= */

exports.releaseTickets = async (
    connection,
    bookingId
) => {

    await connection.execute(
        `
        UPDATE tickets

        SET
            seat_status = 'Available',
            booking_id = NULL,
            updated_at = NOW()

        WHERE booking_id = ?
        `,
        [bookingId]
    );

};

/* =========================================================
    CANCEL TICKETS
========================================================= */

exports.cancelTickets = async (
    connection,
    bookingId
) => {

    await connection.execute(
        `
        UPDATE tickets

        SET
            seat_status = 'Cancelled',
            updated_at = NOW()

        WHERE booking_id = ?
        `,
        [bookingId]
    );

};

/* =========================================================
    GET TICKETS BY BOOKING
========================================================= */

exports.getTicketsByBooking = async (
    connection,
    bookingId
) => {

    const [rows] =
        await connection.query(
            `
            SELECT
                t.*,

                s.seat_row,
                s.seat_number,

                s.seat_type

            FROM tickets t

            LEFT JOIN seats s
                ON t.seat_id =
                s.seat_id

            WHERE t.booking_id = ?
            `,
            [bookingId]
        );

    return rows;

};

/* =========================================================
    GET TICKET BY CODE
========================================================= */

exports.getTicketByCode = async (
    connection,
    ticketCode
) => {

    const [rows] =
        await connection.query(
            `
            SELECT *

            FROM tickets

            WHERE ticket_code = ?

            LIMIT 1
            `,
            [ticketCode]
        );

    return rows.length
        ? rows[0]
        : null;

};

/* =========================================================
    MARK TICKET USED
========================================================= */

exports.markTicketUsed = async (
    connection,
    ticketId
) => {

    await connection.execute(
        `
        UPDATE tickets

        SET
            ticket_status = 'Used',
            seat_status = 'Used',
            updated_at = NOW()

        WHERE ticket_id = ?
        `,
        [ticketId]
    );

};

/* =========================================================
    CHECK RESERVED TICKETS
========================================================= */

exports.hasReservedTickets = async (
    connection,
    bookingId
) => {

    const [rows] =
        await connection.execute(
            `
            SELECT COUNT(*) AS total

            FROM tickets

            WHERE booking_id = ?
            AND seat_status = 'Reserved'
            `,
            [bookingId]
        );

    return rows[0].total > 0;

};
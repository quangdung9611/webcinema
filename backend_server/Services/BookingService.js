const db = require('../Config/db');

/* =========================================================
    COMPLETE BOOKING
========================================================= */

exports.completeBooking = async (
    connection,
    bookingId
) => {

    await connection.execute(
        `
        UPDATE bookings
        SET status = 'Completed'
        WHERE booking_id = ?
        `,
        [bookingId]
    );

};

/* =========================================================
    CANCEL BOOKING
========================================================= */

exports.cancelBooking = async (
    connection,
    bookingId
) => {

    await connection.execute(
        `
        UPDATE bookings
        SET status = 'Cancelled'
        WHERE booking_id = ?
        `,
        [bookingId]
    );

};

/* =========================================================
    GET BOOKING DETAIL
========================================================= */

exports.getBookingDetail = async (
    connection,
    bookingId
) => {

    const [rows] = await connection.query(
    `
    SELECT 
        b.booking_id,
        b.user_id,

        u.full_name,
        u.email,

        m.title AS movie_name,
        m.poster_url AS movie_poster,

        c.cinema_name AS cinema_name,

        r.room_name AS room_name,

        DATE_FORMAT(
            s.start_time,
            '%Y-%m-%d %H:%i:%s'
        ) AS start_time,

        GROUP_CONCAT(
            DISTINCT bd.item_name
            SEPARATOR ', '
        ) AS seat_label

    FROM bookings b

    LEFT JOIN users u
        ON b.user_id = u.user_id

    LEFT JOIN showtimes s
        ON b.showtime_id =
        s.showtime_id

    LEFT JOIN movies m
        ON s.movie_id =
        m.movie_id

    LEFT JOIN cinemas c
        ON s.cinema_id =
        c.cinema_id

    LEFT JOIN rooms r
        ON s.room_id =
        r.room_id

    LEFT JOIN booking_details bd
        ON b.booking_id =
        bd.booking_id

    WHERE b.booking_id = ?

    GROUP BY b.booking_id
    `,
    [bookingId]
    );

    return rows.length
        ? rows[0]
        : null;

};

/* =========================================================
    GET FOOD DETAIL
========================================================= */

exports.getFoodDetail = async (
    connection,
    bookingId
) => {

    const [rows] = await connection.query(
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

    return rows;

};

/* =========================================================
    CHECK BOOKING EXISTS
========================================================= */

exports.findBookingById = async (
    connection,
    bookingId
) => {

    const [rows] = await connection.execute(
        `
        SELECT *
        FROM bookings
        WHERE booking_id = ?
        LIMIT 1
        `,
        [bookingId]
    );

    return rows.length
        ? rows[0]
        : null;

};

/* =========================================================
    GET BOOKING STATUS
========================================================= */

exports.getBookingStatus = async (
    connection,
    bookingId
) => {

    const [rows] = await connection.execute(
        `
        SELECT status
        FROM bookings
        WHERE booking_id = ?
        LIMIT 1
        `,
        [bookingId]
    );

    return rows.length
        ? rows[0].status
        : null;

};
const db = require('../Config/db');
const bookingService = require('./BookingService');
const ticketService = require('./TicketService');

/* =========================================================
    1. PROCESS ORDER
========================================================= */

exports.processOrder = async (connection, data) => {

    const {
        userId,
        showtimeId,
        totalAmount,
        couponId,
        selectedSeats,
        selectedFoods
    } = data;

    // Get showtime info
    const [rows] = await connection.execute(
        `
        SELECT room_id, cinema_id
        FROM showtimes
        WHERE showtime_id = ?
        `,
        [showtimeId]
    );

    const room_id = rows[0]?.room_id || null;
    const cinema_id = rows[0]?.cinema_id || null;

    const memo = `DUNG${Date.now()}`;

    // Create booking
    const [result] = await connection.execute(
        `
        INSERT INTO bookings
        (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo)
        VALUES (?, ?, ?, ?, 'Pending', NOW(), ?)
        `,
        [userId, showtimeId, totalAmount, couponId || null, memo]
    );

    const bookingId = result.insertId;

    /* =========================
        SEATS
    ========================= */

    if (selectedSeats?.length) {

        for (const seat of selectedSeats) {

            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, seat_id, price, item_name, quantity)
                VALUES (?, ?, ?, ?, 1)
                `,
                [
                    bookingId,
                    seat.seat_id,
                    seat.price,
                    `Ghế ${seat.seat_row}${seat.seat_number}`
                ]
            );

            const tempCode = `WAIT-${Date.now()}-${seat.seat_id}`;

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
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Reserved', 'Valid', NOW())
                `,
                [
                    bookingId,
                    showtimeId,
                    room_id,
                    cinema_id,
                    seat.seat_id,
                    tempCode,
                    seat.price
                ]
            );
        }
    }

    /* =========================
        FOODS
    ========================= */

    if (selectedFoods?.length) {

        for (const food of selectedFoods) {

            await connection.execute(
                `
                INSERT INTO booking_details
                (booking_id, product_id, item_name, quantity, price)
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

    return { bookingId, memo };
};

/* =========================================================
    2. ADD POINTS
========================================================= */

exports.addPoints = async (bookingId, userId, connection) => {

    const [rows] = await connection.execute(
        `
        SELECT price, quantity, seat_id
        FROM booking_details
        WHERE booking_id = ?
        `,
        [bookingId]
    );

    let points = 0;

    for (const item of rows) {

        const total = Number(item.price || 0) * Number(item.quantity || 0);

        if (item.seat_id) {
            points += Math.floor(total * 0.05);
        } else {
            points += Math.floor(total * 0.03);
        }
    }

    if (points > 0) {
        await connection.execute(
            `
            UPDATE users
            SET points = points + ?
            WHERE user_id = ?
            `,
            [points, userId]
        );
    }
};

/* =========================================================
    3. MOMO COMPLETION
========================================================= */

exports.executeMomoCompletion = async (bookingId, connection) => {

    const [rows] = await connection.execute(
        `
        SELECT user_id, status
        FROM bookings
        WHERE booking_id = ?
        `,
        [bookingId]
    );

    if (!rows.length) return;

    const booking = rows[0];

    if (String(booking.status).toLowerCase() === 'completed') return;

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
            ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
            updated_at = NOW()
        WHERE booking_id = ?
        AND seat_status = 'Reserved'
        `,
        [bookingId]
    );

    await connection.execute(
        `
        UPDATE seats s
        JOIN booking_details bd ON s.seat_id = bd.seat_id
        SET s.seat_status = 'Booked'
        WHERE bd.booking_id = ?
        `,
        [bookingId]
    );

    await exports.addPoints(
        bookingId,
        booking.user_id,
        connection
    );
};

/* =========================================================
    4. BANK COMPLETION
========================================================= */

exports.executeBankCompletion = async (bookingId, connection) => {

    const [rows] = await connection.execute(
        `
        SELECT user_id, status
        FROM bookings
        WHERE booking_id = ?
        `,
        [bookingId]
    );

    if (!rows.length) return;

    const booking = rows[0];

    if (String(booking.status).toLowerCase() === 'completed') return;

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
            ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
            updated_at = NOW()
        WHERE booking_id = ?
        `,
        [bookingId]
    );

    await connection.execute(
        `
        UPDATE seats s
        JOIN booking_details bd ON s.seat_id = bd.seat_id
        SET s.seat_status = 'Booked'
        WHERE bd.booking_id = ?
        `,
        [bookingId]
    );

    await exports.addPoints(
        bookingId,
        booking.user_id,
        connection
    );
};
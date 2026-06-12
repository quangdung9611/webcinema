const db = require('../Config/db');

/* =========================================================
CALCULATE BOOKING POINTS
========================================================= */

exports.calculateBookingPoints = async (
    connection,
    bookingId
) => {

const [details] =
    await connection.execute(
        `
        SELECT
            bd.price,
            bd.quantity,
            s.seat_type

        FROM booking_details bd

        LEFT JOIN seats s
            ON bd.seat_id =
            s.seat_id

        WHERE bd.booking_id = ?
        `,
        [bookingId]
    );

let totalPoints = 0;

for (const item of details) {

    const itemTotal =
        Number(item.price) *
        Number(item.quantity);

    const type =
        String(
            item.seat_type || ''
        ).toUpperCase();

    let rate = 0.05;

    if (type === 'VIP') {

        rate = 0.10;

    } else if (
        [
            'DOUBLE',
            'SWEETBOX',
            'COUPLE'
        ].includes(type)
    ) {

        rate = 0.07;
    }

    totalPoints +=
        Math.floor(
            itemTotal * rate
        );
}

return totalPoints;
```

};

/* =========================================================
ADD POINTS TO USER
========================================================= */

exports.addPointsToUser = async (
connection,
userId,
points
) => {

```
if (
    !points ||
    points <= 0
) {
    return;
}

await connection.execute(
    `
    UPDATE users

    SET points =
        points + ?

    WHERE user_id = ?
    `,
    [
        points,
        userId
    ]
);
```

};

/* =========================================================
SUBTRACT POINTS
========================================================= */

exports.subtractPointsFromUser = async (
connection,
userId,
points
) => {

```
if (
    !points ||
    points <= 0
) {
    return;
}

await connection.execute(
    `
    UPDATE users

    SET points =
        GREATEST(
            points - ?,
            0
        )

    WHERE user_id = ?
    `,
    [
        points,
        userId
    ]
);
```

};

/* =========================================================
GET USER POINTS
========================================================= */

exports.getUserPoints = async (
userId
) => {

```
const [rows] =
    await db.execute(
        `
        SELECT points

        FROM users

        WHERE user_id = ?

        LIMIT 1
        `,
        [userId]
    );

return rows.length
    ? Number(rows[0].points)
    : 0;
```

};

/* =========================================================
CHECK USER HAS ENOUGH POINTS
========================================================= */

exports.hasEnoughPoints = async (
userId,
points
) => {

```
const currentPoints =
    await exports.getUserPoints(
        userId
    );

return currentPoints >= points;

};
/* =========================================================
GET USER POINT INFO
========================================================= */

exports.getPointInfo = async (
    userId
) => {

    const [rows] =
        await db.execute(
            `
            SELECT
                user_id,
                full_name,
                points
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

    return rows.length
        ? rows[0]
        : null;

};
/* =========================================================
REFUND POINTS
========================================================= */

exports.refundPoints = async (
    connection,
    bookingId
) => {

    const points =
        await exports.calculateBookingPoints(
            connection,
            bookingId
        );

    const [bookingRows] =
        await connection.execute(
            `
            SELECT user_id
            FROM bookings
            WHERE booking_id = ?
            `,
            [bookingId]
        );

    if (!bookingRows.length) {
        return;
    }

    await exports.subtractPointsFromUser(
        connection,
        bookingRows[0].user_id,
        points
    );

};


const db = require("../Config/db");

class BookingRepository {

    // ==========================================================
    // LẤY DANH SÁCH BOOKING - PAGINATION
    // Mặc định: 20 booking / trang
    // Tối đa: 100 booking / trang
    // ==========================================================
    async findAll(page = 1, limit = 20) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá nhiều dữ liệu
        if (limit > 100) {
            limit = 100;
        }

        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH BOOKING
        // ======================================================
        const [rows] = await db.execute(
            `
            SELECT
                b.booking_id,

                DATE_FORMAT(
                    b.booking_date,
                    '%d/%m/%Y %H:%i'
                ) AS booking_date,

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
                ON b.showtime_id = s.showtime_id

            LEFT JOIN movies m
                ON s.movie_id = m.movie_id

            ORDER BY b.booking_id DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ BOOKING
        // ======================================================
        const [countRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM bookings
            `
        );

        const total = Number(
            countRows[0]?.total || 0
        );


        // ======================================================
        // TÍNH TỔNG SỐ TRANG
        // ======================================================
        const totalPages = Math.ceil(
            total / limit
        );


        // ======================================================
        // RETURN
        // ======================================================
        return {
            data: rows,

            pagination: {
                page,
                limit,
                total,
                totalPages,

                hasPreviousPage: page > 1,

                hasNextPage: page < totalPages
            }
        };
    }


    // ==========================================================
    // LẤY BOOKING THEO ID
    // Không pagination
    // Dùng connection vì có transaction
    // ==========================================================
    async findById(
        connection,
        bookingId
    ) {

        const [rows] = await connection.query(
            `
            SELECT *
            FROM bookings
            WHERE booking_id = ?
            LIMIT 1
            `,
            [bookingId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY CHI TIẾT BOOKING
    // Không pagination
    // ==========================================================
    async getDetail(
        connection,
        bookingId
    ) {

        const [rows] = await connection.query(
            `
            SELECT
                b.booking_id,
                b.user_id,
                b.total_amount,
                b.status,
                b.memo,

                u.full_name,

                COALESCE(
                    b.email,
                    u.email
                ) AS email,

                m.title AS movie_name,
                m.movie_poster,

                c.cinema_name,

                r.room_name,

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

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY FOOD DETAILS
    // Không pagination
    // ==========================================================
    async getFoodDetails(
        connection,
        bookingId
    ) {

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
    }


    // ==========================================================
    // LẤY STATUS BOOKING
    // Không pagination
    // ==========================================================
    async getStatus(
        connection,
        bookingId
    ) {

        const [rows] = await connection.query(
            `
            SELECT status
            FROM bookings
            WHERE booking_id = ?
            LIMIT 1
            `,
            [bookingId]
        );

        return rows[0]?.status || null;
    }


    // ==========================================================
    // CẬP NHẬT STATUS
    // ==========================================================
    async updateStatus(
        connection,
        bookingId,
        status
    ) {

        await connection.execute(
            `
            UPDATE bookings
            SET status = ?
            WHERE booking_id = ?
            `,
            [
                status,
                bookingId
            ]
        );
    }


    // ==========================================================
    // CẬP NHẬT EMAIL BOOKING
    // ==========================================================
    async updateEmail(
        connection,
        bookingId,
        email
    ) {

        const query = `
            UPDATE bookings
            SET email = ?
            WHERE booking_id = ?
        `;

        const [result] = await connection.execute(
            query,
            [
                email,
                bookingId
            ]
        );

        return result;
    }


    // ==========================================================
    // XÓA BOOKING
    // ==========================================================
    async delete(bookingId) {

        const [result] = await db.execute(
            `
            DELETE FROM bookings
            WHERE booking_id = ?
            `,
            [bookingId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // CONNECTION
    // ==========================================================
    async getConnection() {

        return db.getConnection();
    }


    // ==========================================================
    // BEGIN TRANSACTION
    // ==========================================================
    async beginTransaction(conn) {

        await conn.beginTransaction();
    }


    // ==========================================================
    // COMMIT
    // ==========================================================
    async commit(conn) {

        await conn.commit();
    }


    // ==========================================================
    // ROLLBACK
    // ==========================================================
    async rollback(conn) {

        await conn.rollback();
    }
}

module.exports = new BookingRepository();


const db = require("../Config/db");

class BookingRepository {

    // ==========================================================
    // LẤY DANH SÁCH BOOKING - PAGINATION + SEARCH
    // QUAN TRỌNG: Dùng db.query thay vì db.execute
    // ==========================================================
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE
                    b.memo LIKE ?
                    OR u.full_name LIKE ?
                    OR u.email LIKE ?
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        // Dùng db.query để tránh lỗi stmt_execute không khớp placeholder
        const [rows] = await db.query(
            `
            SELECT
                b.booking_id,
                DATE_FORMAT(b.booking_date, '%d/%m/%Y %H:%i') AS booking_date,
                b.total_amount,
                b.status,
                b.memo,
                u.full_name AS customer_name,
                u.email AS customer_email,
                m.title AS movie_title
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
            LEFT JOIN movies m ON s.movie_id = m.movie_id
            ${whereClause}
            ORDER BY b.booking_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            ${whereClause}
            `,
            queryParams
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

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
    // LẤY BOOKING THEO ID (Dùng transaction)
    // ==========================================================
    async findById(connection, bookingId) {
        const [rows] = await connection.query(
            `SELECT * FROM bookings WHERE booking_id = ? LIMIT 1`,
            [bookingId]
        );
        return rows[0] || null;
    }

    // ==========================================================
    // LẤY CHI TIẾT BOOKING (Dùng transaction)
    // ==========================================================
    async getDetail(connection, bookingId) {
        const [rows] = await connection.query(
            `
            SELECT
                b.booking_id,
                b.user_id,
                b.total_amount,
                b.status,
                b.memo,
                u.full_name,
                COALESCE(b.email, u.email) AS email,
                m.title AS movie_name,
                m.movie_poster,
                c.cinema_name,
                r.room_name,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
                GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seat_label
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
            LEFT JOIN movies m ON s.movie_id = m.movie_id
            LEFT JOIN cinemas c ON s.cinema_id = c.cinema_id
            LEFT JOIN rooms r ON s.room_id = r.room_id
            LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
            WHERE b.booking_id = ?
            GROUP BY b.booking_id
            `,
            [bookingId]
        );
        return rows[0] || null;
    }

    // ==========================================================
    // LẤY FOOD DETAILS (Dùng transaction)
    // ==========================================================
    async getFoodDetails(connection, bookingId) {
        const [rows] = await connection.query(
            `
            SELECT item_name, quantity
            FROM booking_details
            WHERE booking_id = ? AND seat_id IS NULL
            `,
            [bookingId]
        );
        return rows;
    }

    // ==========================================================
    // CẬP NHẬT STATUS (Dùng transaction)
    // ==========================================================
    async updateStatus(connection, bookingId, status) {
        await connection.query(
            `UPDATE bookings SET status = ? WHERE booking_id = ?`,
            [status, bookingId]
        );
    }

    // ==========================================================
    // XÓA BOOKING
    // ==========================================================
    async delete(bookingId) {
        const [result] = await db.query(
            `DELETE FROM bookings WHERE booking_id = ?`,
            [bookingId]
        );
        return result.affectedRows;
    }

    // ==========================================================
    // CONNECTION & TRANSACTION (Giữ nguyên)
    // ==========================================================
    async getConnection() { return db.getConnection(); }
    async beginTransaction(conn) { await conn.beginTransaction(); }
    async commit(conn) { await conn.commit(); }
    async rollback(conn) { await conn.rollback(); }
}

module.exports = new BookingRepository();
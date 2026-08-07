const db = require("../Config/db");

class TicketRepository {

    async getConnection() {
        return await db.getConnection();
    }

    // Lấy danh sách vé có phân trang (admin)
    async findAll(connection, page = 1, limit = 20) {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        const offset = (page - 1) * limit;

        const [rows] = await connection.query(
            `
            SELECT
                t.*,
                s.seat_row,
                s.seat_number,
                s.seat_type,
                u.full_name AS customer_name,
                u.email AS customer_email,
                m.title AS movie_title,
                c.cinema_name,
                r.room_name,
                DATE_FORMAT(sh.start_time, '%Y-%m-%d %H:%i') AS showtime
            FROM tickets t
            LEFT JOIN seats s ON t.seat_id = s.seat_id
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            LEFT JOIN showtimes sh ON t.showtime_id = sh.showtime_id
            LEFT JOIN movies m ON sh.movie_id = m.movie_id
            LEFT JOIN rooms r ON sh.room_id = r.room_id
            LEFT JOIN cinemas c ON sh.cinema_id = c.cinema_id
            ORDER BY t.ticket_id DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );

        const [countRows] = await connection.query(`SELECT COUNT(*) AS total FROM tickets`);
        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit);

        return {
            data: rows,
            pagination: {
                page, limit, total, totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    // Lấy vé theo booking (không phân trang)
    async findByBookingId(connection, bookingId) {
        const [rows] = await connection.query(
            `
            SELECT t.*, s.seat_row, s.seat_number, s.seat_type
            FROM tickets t
            LEFT JOIN seats s ON t.seat_id = s.seat_id
            WHERE t.booking_id = ?
            `,
            [bookingId]
        );
        return rows;
    }

    // Lấy vé theo suất chiếu (dùng cho seat map)
    async findByShowtimeId(connection, showtimeId) {
        const [rows] = await connection.query(
            `
            SELECT
                t.*,
                s.seat_row,
                s.seat_number,
                s.seat_type,
                u.full_name AS customer_name
            FROM tickets t
            LEFT JOIN seats s ON t.seat_id = s.seat_id
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE t.showtime_id = ?
            ORDER BY s.seat_row, s.seat_number
            `,
            [showtimeId]
        );
        return rows;
    }

    // Tìm vé theo mã code
    async findByCode(connection, ticketCode) {
        const [rows] = await connection.query(
            `
            SELECT
                t.*,
                s.seat_row,
                s.seat_number,
                s.seat_type,
                u.full_name AS customer_name,
                u.email AS customer_email
            FROM tickets t
            LEFT JOIN seats s ON t.seat_id = s.seat_id
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE t.ticket_code = ?
            LIMIT 1
            `,
            [ticketCode]
        );
        return rows[0] || null;
    }

    // Lấy sơ đồ ghế theo suất chiếu
    async getSeatMapByShowtime(connection, showtimeId) {
        const [rows] = await connection.query(
            `
            SELECT
                s.seat_id,
                s.seat_row,
                s.seat_number,
                s.seat_type,
                s.price,
                t.seat_status,
                t.ticket_status,
                t.ticket_code,
                u.full_name AS customer_name
            FROM seats s
            LEFT JOIN tickets t
                ON t.seat_id = s.seat_id AND t.showtime_id = ?
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE s.room_id = (SELECT room_id FROM showtimes WHERE showtime_id = ?)
            ORDER BY s.seat_row, s.seat_number
            `,
            [showtimeId, showtimeId]
        );
        return rows;
    }

    // Bulk insert vé (nếu dùng)
    async createBulk(connection, ticketsData) {
        if (!ticketsData.length) return 0;
        const [result] = await connection.query(
            `
            INSERT INTO tickets
            (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status)
            VALUES ?
            `,
            [ticketsData]
        );
        return result.affectedRows;
    }

    // Đánh dấu vé đã sử dụng (check‑in)
    async markUsed(connection, ticketId) {
        const [result] = await connection.execute(
            `UPDATE tickets SET ticket_status = 'Used', updated_at = NOW() WHERE ticket_id = ?`,
            [ticketId]
        );
        return result.affectedRows;
    }

    // Lấy thông tin booking (để tạo vé)
    async getBookingInfo(connection, bookingId) {
        const [rows] = await connection.query(
            `
            SELECT b.showtime_id, s.room_id, s.cinema_id
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.showtime_id
            WHERE b.booking_id = ?
            `,
            [bookingId]
        );
        return rows[0] || null;
    }

    // Lấy danh sách ghế từ booking_details
    async getSeatDetails(connection, bookingId) {
        const [rows] = await connection.query(
            `SELECT seat_id, price FROM booking_details WHERE booking_id = ? AND seat_id IS NOT NULL`,
            [bookingId]
        );
        return rows;
    }
}

module.exports = new TicketRepository();
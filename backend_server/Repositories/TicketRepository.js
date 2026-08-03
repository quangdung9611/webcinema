
const db = require("../Config/db");

class TicketRepository {

    // ==========================================================
    // LẤY KẾT NỐI DB
    // ==========================================================
    async getConnection() {
        return await db.getConnection();
    }


    // ==========================================================
    // LẤY DANH SÁCH VÉ - PAGINATION
    // Mặc định: 20 vé / trang
    // Tối đa: 100 vé / trang
    // ==========================================================
    async findAll(connection, page = 1, limit = 20) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        // Page mặc định
        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        // Limit mặc định
        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá nhiều vé một lần
        if (limit > 100) {
            limit = 100;
        }

        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH VÉ
        // ======================================================
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

                DATE_FORMAT(
                    sh.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS showtime

            FROM tickets t

            LEFT JOIN seats s
                ON t.seat_id = s.seat_id

            LEFT JOIN bookings b
                ON t.booking_id = b.booking_id

            LEFT JOIN users u
                ON b.user_id = u.user_id

            LEFT JOIN showtimes sh
                ON t.showtime_id = sh.showtime_id

            LEFT JOIN movies m
                ON sh.movie_id = m.movie_id

            LEFT JOIN rooms r
                ON sh.room_id = r.room_id

            LEFT JOIN cinemas c
                ON sh.cinema_id = c.cinema_id

            ORDER BY t.ticket_id DESC

            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ VÉ
        // ======================================================
        const [countRows] = await connection.query(
            `
            SELECT COUNT(*) AS total
            FROM tickets
            `
        );

        const total = Number(countRows[0]?.total || 0);


        // ======================================================
        // TÍNH TỔNG SỐ TRANG
        // ======================================================
        const totalPages = Math.ceil(total / limit);


        // ======================================================
        // TRẢ KẾT QUẢ
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
    // LẤY VÉ THEO BOOKING
    // Không pagination
    // Vì một booking thường chỉ có số lượng vé nhỏ
    // ==========================================================
    async findByBookingId(connection, bookingId) {

        const [rows] = await connection.query(
            `
            SELECT
                t.*,
                s.seat_row,
                s.seat_number,
                s.seat_type

            FROM tickets t

            LEFT JOIN seats s
                ON t.seat_id = s.seat_id

            WHERE t.booking_id = ?
            `,
            [bookingId]
        );

        return rows;
    }


    // ==========================================================
    // LẤY VÉ THEO SUẤT CHIẾU
    // Không pagination
    // Vì cần toàn bộ ghế của một suất để xử lý seat map
    // ==========================================================
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

            LEFT JOIN seats s
                ON t.seat_id = s.seat_id

            LEFT JOIN bookings b
                ON t.booking_id = b.booking_id

            LEFT JOIN users u
                ON b.user_id = u.user_id

            WHERE t.showtime_id = ?

            ORDER BY
                s.seat_row,
                s.seat_number
            `,
            [showtimeId]
        );

        return rows;
    }


    // ==========================================================
    // LẤY VÉ THEO CODE
    // ==========================================================
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

            LEFT JOIN seats s
                ON t.seat_id = s.seat_id

            LEFT JOIN bookings b
                ON t.booking_id = b.booking_id

            LEFT JOIN users u
                ON b.user_id = u.user_id

            WHERE t.ticket_code = ?

            LIMIT 1
            `,
            [ticketCode]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
    // ==========================================================
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
                ON t.seat_id = s.seat_id
                AND t.showtime_id = ?

            LEFT JOIN bookings b
                ON t.booking_id = b.booking_id

            LEFT JOIN users u
                ON b.user_id = u.user_id

            WHERE s.room_id = (
                SELECT room_id
                FROM showtimes
                WHERE showtime_id = ?
            )

            ORDER BY
                s.seat_row,
                s.seat_number
            `,
            [showtimeId, showtimeId]
        );

        return rows;
    }


    // ==========================================================
    // TẠO VÉ - BULK INSERT
    // ==========================================================
    async createBulk(connection, ticketsData) {

        if (!ticketsData.length) {
            return 0;
        }

        const [result] = await connection.query(
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

        return result.affectedRows;
    }


    // ==========================================================
    // CẬP NHẬT TRẠNG THÁI VÉ -> BOOKED
    // ==========================================================
    async updateToBooked(connection, bookingId) {

        const [result] = await connection.execute(
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

        return result.affectedRows;
    }


    // ==========================================================
    // CẬP NHẬT TRẠNG THÁI VÉ -> CANCELLED
    // ==========================================================
    async updateToCancelled(connection, bookingId) {

        const [result] = await connection.execute(
            `
            UPDATE tickets
            SET
                seat_status = 'Cancelled',
                updated_at = NOW()

            WHERE booking_id = ?
            `,
            [bookingId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // GIẢI PHÓNG VÉ RESERVED
    // ==========================================================
    async releaseReserved(connection, bookingId) {

        const [result] = await connection.execute(
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

        return result.affectedRows;
    }


    // ==========================================================
    // ĐÁNH DẤU VÉ ĐÃ SỬ DỤNG
    // ==========================================================
    async markUsed(connection, ticketId) {

        const [result] = await connection.execute(
            `
            UPDATE tickets
            SET
                ticket_status = 'Used',
                updated_at = NOW()

            WHERE ticket_id = ?
            `,
            [ticketId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // KIỂM TRA VÉ RESERVED
    // ==========================================================
    async hasReservedTickets(connection, bookingId) {

        const [rows] = await connection.execute(
            `
            SELECT COUNT(*) AS total

            FROM tickets

            WHERE booking_id = ?
                AND seat_status = 'Reserved'
            `,
            [bookingId]
        );

        return rows[0].total > 0;
    }


    // ==========================================================
    // LẤY THÔNG TIN BOOKING
    // ==========================================================
    async getBookingInfo(connection, bookingId) {

        const [rows] = await connection.query(
            `
            SELECT
                b.showtime_id,
                s.room_id,
                s.cinema_id

            FROM bookings b

            JOIN showtimes s
                ON b.showtime_id = s.showtime_id

            WHERE b.booking_id = ?
            `,
            [bookingId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY CHI TIẾT GHẾ
    // ==========================================================
    async getSeatDetails(connection, bookingId) {

        const [rows] = await connection.query(
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

        return rows;
    }
}

module.exports = new TicketRepository();


const db = require("../Config/db");

class BookingRepository {

    // =========================================================
    // CONSTANTS
    // =========================================================

    static BOOKING_STATUS = {
        PENDING: "Pending",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
    };

    static SEAT_STATUS = {
        AVAILABLE: "Available",
        BOOKED: "Booked",
        RESERVED: "Reserved",
        MAINTENANCE: "Maintenance",
    };

    static TICKET_STATUS = {
        VALID: "Valid",
        USED: "Used",
        CANCELLED: "Cancelled",
    };

    // =========================================================
    // FIND ALL - KHÔNG PHÂN TRANG (ADMIN)
    // =========================================================

    async findAllAll(search = "") {
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

            queryParams.push(
                keyword,
                keyword,
                keyword
            );
        }

        const [rows] = await db.query(
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

            ${whereClause}

            ORDER BY b.booking_id DESC
            `,
            queryParams
        );

        return rows;
    }

    // =========================================================
    // FIND ALL - CÓ PHÂN TRANG (ADMIN)
    // =========================================================

    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) {
            page = 1;
        }

        if (limit < 1) {
            limit = 20;
        }

        if (limit > 100) {
            limit = 100;
        }

        search = typeof search === "string"
            ? search.trim()
            : "";

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

            queryParams.push(
                keyword,
                keyword,
                keyword
            );
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
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

            ${whereClause}

            ORDER BY b.booking_id DESC

            LIMIT ? OFFSET ?
            `,
            [
                ...queryParams,
                limit,
                offset
            ]
        );

        const [countRows] = await db.query(
            `
            SELECT
                COUNT(*) AS total

            FROM bookings b

            LEFT JOIN users u
                ON b.user_id = u.user_id

            ${whereClause}
            `,
            queryParams
        );

        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages =
            Math.ceil(total / limit) || 1;

        return {
            data: rows,

            pagination: {
                page,
                limit,
                total,
                totalPages,

                hasPreviousPage:
                    page > 1,

                hasNextPage:
                    page < totalPages,
            },
        };
    }

    // =========================================================
    // FIND BOOKING BY ID
    // =========================================================

    async findById(connection, bookingId) {
        if (!connection) {
            throw new Error(
                "BookingRepository.findById requires connection"
            );
        }

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

    // =========================================================
    // FIND BOOKING BY ID + FOR UPDATE
    //
    // Dùng khi transaction cần khóa booking.
    // =========================================================

    async findByIdForUpdate(connection, bookingId) {
        if (!connection) {
            throw new Error(
                "BookingRepository.findByIdForUpdate requires connection"
            );
        }

        const [rows] = await connection.query(
            `
            SELECT *
            FROM bookings
            WHERE booking_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [bookingId]
        );

        return rows[0] || null;
    }

    // =========================================================
    // GET DETAIL
    // =========================================================

    async getDetail(connection, bookingId) {
        if (!connection) {
            throw new Error(
                "BookingRepository.getDetail requires connection"
            );
        }

        const [rows] = await connection.query(
            `
            SELECT
                b.booking_id,
                b.user_id,
                b.showtime_id,
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

            GROUP BY
                b.booking_id
            `,
            [bookingId]
        );

        return rows[0] || null;
    }

    // =========================================================
    // GET FOOD DETAILS
    // =========================================================

    async getFoodDetails(connection, bookingId) {
        if (!connection) {
            throw new Error(
                "BookingRepository.getFoodDetails requires connection"
            );
        }

        const [rows] = await connection.query(
            `
            SELECT
                item_name,
                quantity,
                price,
                product_id

            FROM booking_details

            WHERE
                booking_id = ?
                AND seat_id IS NULL

            ORDER BY booking_detail_id ASC
            `,
            [bookingId]
        );

        return rows;
    }

    // =========================================================
    // UPDATE STATUS
    // =========================================================

    async updateStatus(
        connection,
        bookingId,
        status
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.updateStatus requires connection"
            );
        }

        const [result] = await connection.query(
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

        return result.affectedRows;
    }

    // =========================================================
    // UPDATE CUSTOMER INFO
    // =========================================================

    async updateCustomerInfo(
        connection,
        bookingId,
        fullName,
        phone,
        email
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.updateCustomerInfo requires connection"
            );
        }

        const [result] = await connection.query(
            `
            UPDATE bookings

            SET
                full_name = ?,
                phone = ?,
                email = ?

            WHERE booking_id = ?
            `,
            [
                fullName,
                phone,
                email,
                bookingId
            ]
        );

        return result.affectedRows;
    }

    // =========================================================
    // CREATE BOOKING
    //
    // Dùng bên trong transaction.
    // =========================================================

    async createBooking(
        connection,
        {
            userId,
            email,
            showtimeId,
            couponId = null,
            totalAmount,
            status = BookingRepository.BOOKING_STATUS.PENDING,
            memo = null,
        }
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.createBooking requires connection"
            );
        }

        const [result] = await connection.query(
            `
            INSERT INTO bookings (
                user_id,
                email,
                showtime_id,
                coupon_id,
                total_amount,
                status,
                memo
            )

            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                email,
                showtimeId,
                couponId,
                totalAmount,
                status,
                memo,
            ]
        );

        return result.insertId;
    }

    // =========================================================
    // CREATE BOOKING DETAIL - SEAT
    // =========================================================

    async createSeatBookingDetail(
        connection,
        {
            bookingId,
            itemName,
            quantity = 1,
            price,
            seatId,
        }
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.createSeatBookingDetail requires connection"
            );
        }

        const [result] = await connection.query(
            `
            INSERT INTO booking_details (
                booking_id,
                item_name,
                quantity,
                price,
                seat_id
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                bookingId,
                itemName,
                quantity,
                price,
                seatId,
            ]
        );

        return result.insertId;
    }

    // =========================================================
    // CREATE BOOKING DETAIL - FOOD
    // =========================================================

    async createFoodBookingDetail(
        connection,
        {
            bookingId,
            productId = null,
            itemName,
            quantity = 1,
            price,
        }
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.createFoodBookingDetail requires connection"
            );
        }

        const [result] = await connection.query(
            `
            INSERT INTO booking_details (
                product_id,
                booking_id,
                item_name,
                quantity,
                price,
                seat_id
            )

            VALUES (?, ?, ?, ?, ?, NULL)
            `,
            [
                productId,
                bookingId,
                itemName,
                quantity,
                price,
            ]
        );

        return result.insertId;
    }

    // =========================================================
    // GET SHOWTIME + ROOM + CINEMA
    //
    // Dùng transaction.
    // =========================================================

    async getShowtimeInfo(
        connection,
        showtimeId
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.getShowtimeInfo requires connection"
            );
        }

        const [rows] = await connection.query(
            `
            SELECT
                s.showtime_id,
                s.movie_id,
                s.cinema_id,
                s.room_id,
                s.start_time,

                c.cinema_name,

                r.room_name,
                r.room_type

            FROM showtimes s

            INNER JOIN cinemas c
                ON s.cinema_id = c.cinema_id

            INNER JOIN rooms r
                ON s.room_id = r.room_id

            WHERE s.showtime_id = ?

            LIMIT 1
            `,
            [showtimeId]
        );

        return rows[0] || null;
    }

    // =========================================================
    // GET SEATS + LOCK FOR UPDATE
    //
    // QUAN TRỌNG:
    // Đây là lớp bảo vệ MySQL cuối cùng.
    //
    // Tất cả seat phải được lock theo thứ tự seat_id
    // để giảm nguy cơ deadlock.
    // =========================================================

    async lockSeatsForBooking(
        connection,
        showtimeId,
        seatIds
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.lockSeatsForBooking requires connection"
            );
        }

        if (!Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error(
                "seatIds must be a non-empty array"
            );
        }

        const normalizedSeatIds = [
            ...new Set(
                seatIds
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            ),
        ].sort((a, b) => a - b);

        if (normalizedSeatIds.length === 0) {
            throw new Error(
                "No valid seat IDs"
            );
        }

        const placeholders =
            normalizedSeatIds
                .map(() => "?")
                .join(", ");

        const [rows] = await connection.query(
            `
            SELECT
                st.seat_id,
                st.room_id,
                st.cinema_id,
                st.seat_row,
                st.seat_number,
                st.seat_type,
                st.price,
                st.is_active,

                s.room_id AS showtime_room_id,
                s.cinema_id AS showtime_cinema_id

            FROM seats st

            INNER JOIN showtimes s
                ON s.room_id = st.room_id
                AND s.cinema_id = st.cinema_id

            WHERE
                s.showtime_id = ?

                AND st.seat_id IN (${placeholders})

            ORDER BY st.seat_id ASC

            FOR UPDATE
            `,
            [
                showtimeId,
                ...normalizedSeatIds
            ]
        );

        return rows;
    }

    // =========================================================
    // VALIDATE SEATS BELONG TO SHOWTIME
    // =========================================================

    async validateSeatsForShowtime(
        connection,
        showtimeId,
        seatIds
    ) {
        const rows =
            await this.lockSeatsForBooking(
                connection,
                showtimeId,
                seatIds
            );

        const expectedIds = [
            ...new Set(
                seatIds
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            ),
        ].sort((a, b) => a - b);

        if (rows.length !== expectedIds.length) {
            const foundIds = new Set(
                rows.map(row =>
                    Number(row.seat_id)
                )
            );

            const invalidSeatIds =
                expectedIds.filter(
                    id => !foundIds.has(id)
                );

            const error = new Error(
                `Ghế không thuộc suất chiếu: ${invalidSeatIds.join(", ")}`
            );

            error.code =
                "INVALID_SHOWTIME_SEATS";

            error.invalidSeatIds =
                invalidSeatIds;

            throw error;
        }

        for (const seat of rows) {
            if (
                Number(seat.is_active) !== 1
            ) {
                const error = new Error(
                    `Ghế ${seat.seat_id} đang không hoạt động`
                );

                error.code =
                    "SEAT_INACTIVE";

                error.seatId =
                    seat.seat_id;

                throw error;
            }
        }

        return rows;
    }

    // =========================================================
    // GET EXISTING TICKETS FOR SHOWTIME
    //
    // Dùng trong transaction sau khi seat rows đã lock.
    // =========================================================

    async getTicketsForSeats(
        connection,
        showtimeId,
        seatIds
    ) {
        if (
            !Array.isArray(seatIds) ||
            seatIds.length === 0
        ) {
            return [];
        }

        const normalizedSeatIds = [
            ...new Set(
                seatIds
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            ),
        ].sort((a, b) => a - b);

        const placeholders =
            normalizedSeatIds
                .map(() => "?")
                .join(", ");

        const [rows] = await connection.query(
            `
            SELECT
                ticket_id,
                booking_id,
                showtime_id,
                room_id,
                cinema_id,
                seat_id,
                ticket_code,
                price,
                seat_status,
                ticket_status

            FROM tickets

            WHERE
                showtime_id = ?
                AND seat_id IN (${placeholders})

            ORDER BY seat_id ASC

            FOR UPDATE
            `,
            [
                showtimeId,
                ...normalizedSeatIds
            ]
        );

        return rows;
    }

    // =========================================================
    // CHECK SEATS AVAILABLE
    //
    // Phải gọi sau getTicketsForSeats()
    // =========================================================

    async assertSeatsAvailable(
        connection,
        showtimeId,
        seatIds
    ) {
        const tickets =
            await this.getTicketsForSeats(
                connection,
                showtimeId,
                seatIds
            );

        const unavailable = [];

        for (const ticket of tickets) {

            const isCancelled =
                ticket.ticket_status ===
                BookingRepository.TICKET_STATUS.CANCELLED;

            const isAvailable =
                ticket.seat_status ===
                BookingRepository.SEAT_STATUS.AVAILABLE;

            if (
                !isCancelled &&
                !isAvailable
            ) {
                unavailable.push({
                    seatId: Number(ticket.seat_id),
                    seatStatus: ticket.seat_status,
                    ticketStatus: ticket.ticket_status,
                });
            }
        }

        if (unavailable.length > 0) {
            const error = new Error(
                "Một hoặc nhiều ghế đã được đặt bởi người khác"
            );

            error.code =
                "SEATS_ALREADY_BOOKED";

            error.unavailableSeats =
                unavailable;

            throw error;
        }

        return true;
    }

    // =========================================================
    // CREATE / REACTIVATE TICKET
    //
    // CSDL có UNIQUE:
    //
    // showtime_id
    // cinema_id
    // room_id
    // seat_id
    //
    // Vì vậy KHÔNG INSERT mù.
    //
    // Nếu ticket cũ Cancelled -> tái sử dụng.
    // Nếu ticket đang active -> báo lỗi.
    // =========================================================

    async createTicket(
        connection,
        {
            bookingId,
            showtimeId,
            roomId,
            cinemaId,
            seatId,
            ticketCode,
            price,
        }
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.createTicket requires connection"
            );
        }

        // -----------------------------------------------------
        // LOCK existing ticket
        // -----------------------------------------------------

        const [existingRows] =
            await connection.query(
                `
                SELECT
                    ticket_id,
                    booking_id,
                    seat_status,
                    ticket_status

                FROM tickets

                WHERE
                    showtime_id = ?
                    AND cinema_id = ?
                    AND room_id = ?
                    AND seat_id = ?

                LIMIT 1

                FOR UPDATE
                `,
                [
                    showtimeId,
                    cinemaId,
                    roomId,
                    seatId,
                ]
            );

        const existing =
            existingRows[0];

        // -----------------------------------------------------
        // TICKET EXISTS
        // -----------------------------------------------------

        if (existing) {

            const canReuse =
                existing.ticket_status ===
                BookingRepository.TICKET_STATUS.CANCELLED;

            if (!canReuse) {

                const error = new Error(
                    `Ghế ${seatId} đã được đặt`
                );

                error.code =
                    "SEAT_ALREADY_BOOKED";

                error.seatId =
                    seatId;

                throw error;
            }

            // -------------------------------------------------
            // REACTIVATE CANCELLED TICKET
            // -------------------------------------------------

            const [updateResult] =
                await connection.query(
                    `
                    UPDATE tickets

                    SET
                        booking_id = ?,
                        ticket_code = ?,
                        price = ?,
                        seat_status = 'Booked',
                        ticket_status = 'Valid'

                    WHERE ticket_id = ?
                    `,
                    [
                        bookingId,
                        ticketCode,
                        price,
                        existing.ticket_id,
                    ]
                );

            if (
                updateResult.affectedRows !== 1
            ) {
                const error = new Error(
                    `Không thể cập nhật ticket cho ghế ${seatId}`
                );

                error.code =
                    "TICKET_UPDATE_FAILED";

                throw error;
            }

            return existing.ticket_id;
        }

        // -----------------------------------------------------
        // CREATE NEW TICKET
        // -----------------------------------------------------

        try {

            const [result] =
                await connection.query(
                    `
                    INSERT INTO tickets (
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

                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'Booked',
                        'Valid'
                    )
                    `,
                    [
                        bookingId,
                        showtimeId,
                        roomId,
                        cinemaId,
                        seatId,
                        ticketCode,
                        price,
                    ]
                );

            return result.insertId;

        } catch (error) {

            // -------------------------------------------------
            // UNIQUE CONSTRAINT
            // -------------------------------------------------

            if (error?.code === "ER_DUP_ENTRY") {

                const duplicateError =
                    new Error(
                        `Ghế ${seatId} vừa được người khác đặt`
                    );

                duplicateError.code =
                    "SEAT_ALREADY_BOOKED";

                duplicateError.seatId =
                    seatId;

                throw duplicateError;
            }

            throw error;
        }
    }

    // =========================================================
    // UPDATE USER POINTS
    //
    // Atomic increment:
    //
    // points = points + ?
    //
    // Không SELECT rồi UPDATE riêng.
    // =========================================================

    async addUserPoints(
        connection,
        userId,
        points
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.addUserPoints requires connection"
            );
        }

        const normalizedPoints =
            Number(points);

        if (
            !Number.isFinite(normalizedPoints) ||
            normalizedPoints <= 0
        ) {
            return 0;
        }

        const [result] =
            await connection.query(
                `
                UPDATE users

                SET points = COALESCE(points, 0) + ?

                WHERE user_id = ?
                `,
                [
                    Math.floor(
                        normalizedPoints
                    ),
                    userId,
                ]
            );

        return result.affectedRows;
    }

    // =========================================================
    // GET USER
    // =========================================================

    async getUserForBooking(
        connection,
        userId
    ) {
        if (!connection) {
            throw new Error(
                "BookingRepository.getUserForBooking requires connection"
            );
        }

        const [rows] =
            await connection.query(
                `
                SELECT
                    user_id,
                    full_name,
                    email,
                    phone,
                    points,
                    status

                FROM users

                WHERE user_id = ?

                LIMIT 1

                FOR UPDATE
                `,
                [userId]
            );

        return rows[0] || null;
    }

    // =========================================================
    // DELETE BOOKING
    //
    // Giữ nguyên API cũ.
    // =========================================================

    async delete(bookingId) {
        const [result] =
            await db.query(
                `
                DELETE FROM bookings
                WHERE booking_id = ?
                `,
                [bookingId]
            );

        return result.affectedRows;
    }

    // =========================================================
    // GET CONNECTION
    // =========================================================

    async getConnection() {
        return db.getConnection();
    }

    // =========================================================
    // BEGIN TRANSACTION
    // =========================================================

    async beginTransaction(connection) {
        if (!connection) {
            throw new Error(
                "Connection is required"
            );
        }

        await connection.beginTransaction();
    }

    // =========================================================
    // COMMIT
    // =========================================================

    async commit(connection) {
        if (!connection) {
            throw new Error(
                "Connection is required"
            );
        }

        await connection.commit();
    }

    // =========================================================
    // ROLLBACK
    // =========================================================

    async rollback(connection) {
        if (!connection) {
            throw new Error(
                "Connection is required"
            );
        }

        await connection.rollback();
    }

    // =========================================================
    // RELEASE CONNECTION
    //
    // CỰC KỲ QUAN TRỌNG:
    // connection lấy từ pool phải release().
    // =========================================================

    async releaseConnection(connection) {
        if (!connection) {
            return;
        }

        connection.release();
    }

    // =========================================================
    // SAFE TRANSACTION HELPER
    //
    // Cho phép:
    //
    // await BookingRepository.transaction(
    //     async (connection) => {
    //         ...
    //     }
    // );
    //
    // Tự:
    // BEGIN
    // COMMIT
    // ROLLBACK
    // RELEASE
    // =========================================================

    async transaction(callback) {
        const connection =
            await this.getConnection();

        try {

            await this.beginTransaction(
                connection
            );

            const result =
                await callback(connection);

            await this.commit(
                connection
            );

            return result;

        } catch (error) {

            try {
                await this.rollback(
                    connection
                );
            } catch (rollbackError) {
                console.error(
                    "❌ [BOOKING TRANSACTION] Rollback failed:",
                    rollbackError
                );
            }

            throw error;

        } finally {

            this.releaseConnection(
                connection
            );
        }
    }
}

module.exports = new BookingRepository();
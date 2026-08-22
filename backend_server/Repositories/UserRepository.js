const db = require("../Config/db");

class UserRepository {

    /*=========================================================
        FIND ALL USERS - CÓ PHÂN TRANG (có search)
        RETURN:
        {
            data: [],
            pagination: {}
        }
    =========================================================*/
    async findAll(page = 1, limit = 20, search = "") {

        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string"
            ? search.trim()
            : "";

        let whereClause = "";
        const queryParams = [];

        if (search) {

            whereClause = `
                WHERE
                    username LIKE ?
                    OR full_name LIKE ?
                    OR email LIKE ?
                    OR phone LIKE ?
            `;

            const keyword = `%${search}%`;

            queryParams.push(
                keyword,
                keyword,
                keyword,
                keyword
            );
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                phone,
                role,
                status,
                email_verified,
                email_verified_at,
                address,
                points,
                last_login_at,
                last_login_ip,
                created_at,
                updated_at
            FROM users
            ${whereClause}
            ORDER BY user_id DESC
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
            SELECT COUNT(*) AS total
            FROM users
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
                totalPages:
                    totalPages > 0
                        ? totalPages
                        : 1,
                hasPreviousPage:
                    page > 1,
                hasNextPage:
                    page < totalPages
            }
        };
    }


    /*=========================================================
        FIND ALL USERS - KHÔNG PHÂN TRANG (có search)

        RETURN:
        rows[]

        KHÔNG pagination
        KHÔNG object data
    =========================================================*/
    async findAllAll(search = "") {

        search = typeof search === "string"
            ? search.trim()
            : "";

        let whereClause = "";
        const queryParams = [];

        if (search) {

            whereClause = `
                WHERE
                    username LIKE ?
                    OR full_name LIKE ?
                    OR email LIKE ?
                    OR phone LIKE ?
            `;

            const keyword = `%${search}%`;

            queryParams.push(
                keyword,
                keyword,
                keyword,
                keyword
            );
        }

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                phone,
                role,
                status,
                email_verified,
                email_verified_at,
                address,
                points,
                last_login_at,
                last_login_ip,
                created_at,
                updated_at
            FROM users
            ${whereClause}
            ORDER BY user_id DESC
            `,
            queryParams
        );

        return rows;
    }


    /*=========================================================
        FIND USER BY ID
    =========================================================*/
    async findById(userId) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                phone,
                address,
                password,
                role,
                status,
                email_verified,
                email_verified_at,
                points,
                last_login_at,
                last_login_ip,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        return rows[0] || null;
    }


    /*=========================================================
        FIND USER PROFILE
    =========================================================*/
    async findProfile(userId) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                phone,
                address,
                role,
                status,
                email_verified,
                email_verified_at,
                points,
                last_login_at,
                last_login_ip,
                created_at,
                updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        return rows[0] || null;
    }


    /*=========================================================
        FIND USER BY EMAIL
    =========================================================*/
    async findByEmail(email) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                password,
                phone,
                address,
                role,
                status,
                email_verified,
                email_verified_at,
                points,
                last_login_at,
                last_login_ip
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        return rows[0] || null;
    }


    /*=========================================================
        FIND USER BY USERNAME
    =========================================================*/
    async findByUsername(username) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                user_avatar,
                password,
                phone,
                address,
                role,
                status,
                email_verified,
                email_verified_at,
                points,
                last_login_at,
                last_login_ip
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        return rows[0] || null;
    }


    /*=========================================================
        FIND BASIC USER
    =========================================================*/
    async findBasicById(userId) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                password,
                role,
                status,
                email_verified,
                email_verified_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        return rows[0] || null;
    }


    /*=========================================================
        CHECK USER EXISTS
    =========================================================*/
    async exists(username, email, phone) {

        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                email,
                phone
            FROM users
            WHERE
                username = ?
                OR email = ?
                OR phone = ?
            LIMIT 1
            `,
            [
                username,
                email,
                phone
            ]
        );

        return rows[0] || null;
    }


    /*=========================================================
        CHECK EMAIL EXISTS
    =========================================================*/
    async existsByEmail(email) {

        const [rows] = await db.query(
            `SELECT 1 FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        return rows.length > 0;
    }


    /*=========================================================
        CHECK USERNAME EXISTS
    =========================================================*/
    async existsByUsername(username) {

        const [rows] = await db.query(
            `SELECT 1 FROM users WHERE username = ? LIMIT 1`,
            [username]
        );

        return rows.length > 0;
    }


    /*=========================================================
        CHECK PHONE EXISTS
    =========================================================*/
    async existsByPhone(phone) {

        const [rows] = await db.query(
            `SELECT 1 FROM users WHERE phone = ? LIMIT 1`,
            [phone]
        );

        return rows.length > 0;
    }


    /*=========================================================
        CREATE USER
    =========================================================*/
    async create(user) {

        const [result] = await db.query(
            `
            INSERT INTO users
            (
                username,
                full_name,
                phone,
                address,
                email,
                password,
                user_avatar,
                role,
                status,
                email_verified,
                email_verified_at,
                points
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                user.username,
                user.full_name,
                user.phone,
                user.address || "",
                user.email,
                user.password,
                user.user_avatar || null,
                user.role || "customer",
                user.status || "active",
                user.email_verified || 0,
                user.email_verified_at || null,
                user.points || 0
            ]
        );

        return result.insertId;
    }


    /*=========================================================
        UPDATE PROFILE
    =========================================================*/
    async updateProfile(userId, data) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                username = ?,
                full_name = ?,
                phone = ?,
                address = ?,
                email = ?,
                user_avatar = COALESCE(?, user_avatar),
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                data.username,
                data.full_name,
                data.phone,
                data.address,
                data.email,
                data.user_avatar,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE AVATAR
    =========================================================*/
    async updateAvatar(userId, avatarUrl) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                user_avatar = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                avatarUrl,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE PASSWORD
    =========================================================*/
    async updatePassword(userId, hashedPassword) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                password = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                hashedPassword,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE ROLE
    =========================================================*/
    async updateRole(userId, role) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                role = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                role,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE STATUS
    =========================================================*/
    async updateStatus(userId, status) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                status = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                status,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE EMAIL VERIFIED - ĐÃ CẬP NHẬT THÊM email_verified_at
    =========================================================*/
    async updateEmailVerified(
        userId,
        verified = true
    ) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                email_verified = ?,
                email_verified_at = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                verified ? 1 : 0,
                verified ? new Date() : null,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE EMAIL
    =========================================================*/
    async updateEmail(userId, email) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                email = ?,
                email_verified = 0,
                email_verified_at = NULL,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                email,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        UPDATE LAST LOGIN
    =========================================================*/
    async updateLastLogin(
        userId,
        ipAddress = null
    ) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                last_login_at = NOW(),
                last_login_ip = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                ipAddress,
                userId
            ]
        );

        return result.affectedRows;
    }


    /*=========================================================
        RESET USER POINTS
    =========================================================*/
    async resetPoints(userId) {

        const [result] = await db.query(
            `
            UPDATE users
            SET
                points = 0,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [userId]
        );

        return result.affectedRows;
    }


    /*=========================================================
        DELETE USER
    =========================================================*/
    async delete(userId) {

        const [result] = await db.query(
            `
            DELETE FROM users
            WHERE user_id = ?
            `,
            [userId]
        );

        return result.affectedRows;
    }


    /*=========================================================
        GET BOOKINGS BY USER ID (CÓ HỖ TRỢ LỌC THEO NGÀY)
    =========================================================*/
    async getBookingsByUser(userId, from = null, to = null) {

        let dateCondition = "";
        const params = [userId];

        if (from) {
            dateCondition += " AND DATE(b.booking_date) >= ?";
            params.push(from);
        }
        if (to) {
            dateCondition += " AND DATE(b.booking_date) <= ?";
            params.push(to);
        }

        const [rows] = await db.query(
            `
            SELECT
                b.booking_id AS bookingId,
                b.total_amount AS totalAmount,
                b.status,
                b.booking_date AS bookingDate,
                m.title AS movieTitle,
                m.movie_poster AS moviePoster,
                c.cinema_name AS cinemaName,
                r.room_name AS roomName,
                s.start_time AS startTime,
                DATE_FORMAT(s.start_time, '%d/%m/%Y') AS selectedDate,
                DATE_FORMAT(s.start_time, '%H:%i') AS startTimeDisplay,
                DATE_FORMAT(b.booking_date, '%d/%m/%Y %H:%i') AS bookingDateFull,
                GROUP_CONCAT(
                    CONCAT(st.seat_row, st.seat_number)
                    ORDER BY st.seat_row, st.seat_number
                    SEPARATOR ', '
                ) AS seatDisplay,
                CONCAT('PIN-', LPAD(b.booking_id, 6, '0')) AS ticketPIN
            FROM bookings b
            INNER JOIN showtimes s ON b.showtime_id = s.showtime_id
            INNER JOIN movies m ON s.movie_id = m.movie_id
            INNER JOIN rooms r ON s.room_id = r.room_id
            INNER JOIN cinemas c ON r.cinema_id = c.cinema_id
            LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
            LEFT JOIN seats st ON bd.seat_id = st.seat_id
            WHERE b.user_id = ?
            ${dateCondition}
            GROUP BY b.booking_id
            ORDER BY b.booking_date DESC
            `,
            params
        );
        return rows;
    }


    /*=========================================================
        CLEAR BOOKINGS BY USER (xóa lịch sử và reset điểm)
    =========================================================*/
    async clearBookingsByUser(userId) {
        // Xóa tất cả booking của user (cascade sẽ xóa booking_details, tickets)
        const [result] = await db.query(
            `DELETE FROM bookings WHERE user_id = ?`,
            [userId]
        );
        // Reset điểm về 0
        await db.query(
            `UPDATE users SET points = 0 WHERE user_id = ?`,
            [userId]
        );
        return result.affectedRows;
    }
}

module.exports = new UserRepository();
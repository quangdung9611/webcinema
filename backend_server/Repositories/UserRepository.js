const db = require("../Config/db");

class UserRepository {

    /*=========================================================
        FIND ALL USERS - CÓ PHÂN TRANG
    =========================================================*/
    async findAll(page = 1, limit = 20, search = "") {
        page = Number(page) || 1;
        limit = Math.min(Number(limit) || 20, 100);
        search = String(search).trim();

        let whereClause = "";
        const params = [];

        if (search) {
            whereClause = `WHERE username LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?`;
            const kw = `%${search}%`;
            params.push(kw, kw, kw, kw);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT user_id, username, full_name, email, user_avatar, phone,
                   role, status, email_verified, email_verified_at, address,
                   points, last_login_at, last_login_ip, created_at, updated_at
            FROM users ${whereClause}
            ORDER BY user_id DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM users ${whereClause}`,
            params
        );

        const total = Number(count[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: { page, limit, total, totalPages, hasPreviousPage: page > 1, hasNextPage: page < totalPages }
        };
    }

    /*=========================================================
        FIND ALL USERS - KHÔNG PHÂN TRANG
    =========================================================*/
    async findAllAll(search = "") {
        search = String(search).trim();
        let whereClause = "";
        const params = [];

        if (search) {
            whereClause = `WHERE username LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?`;
            const kw = `%${search}%`;
            params.push(kw, kw, kw, kw);
        }

        const [rows] = await db.query(
            `
            SELECT user_id, username, full_name, email, user_avatar, phone,
                   role, status, email_verified, email_verified_at, address,
                   points, last_login_at, last_login_ip, created_at, updated_at
            FROM users ${whereClause}
            ORDER BY user_id DESC
            `,
            params
        );

        return rows;
    }

    /*=========================================================
        FIND USER BY ID
    =========================================================*/
    async findById(userId) {
        const [rows] = await db.query(
            `
            SELECT user_id, username, full_name, email, user_avatar, phone, address,
                   password, role, status, email_verified, email_verified_at,
                   points, last_login_at, last_login_ip, created_at, updated_at,
                   pin_hash
            FROM users WHERE user_id = ? LIMIT 1
            `,
            [userId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        FIND USER PROFILE (KHÔNG PASSWORD)
    =========================================================*/
    async findProfile(userId) {
        const [rows] = await db.query(
            `
            SELECT user_id, username, full_name, email, user_avatar, phone, address,
                   role, status, email_verified, email_verified_at,
                   points, last_login_at, last_login_ip, created_at, updated_at,
                   pin_hash
            FROM users WHERE user_id = ? LIMIT 1
            `,
            [userId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        FIND BY EMAIL
    =========================================================*/
    async findByEmail(email) {
        const [rows] = await db.query(
            `SELECT * FROM users WHERE email = ? LIMIT 1`,
            [email]
        );
        return rows[0] || null;
    }

    /*=========================================================
        FIND BY USERNAME
    =========================================================*/
    async findByUsername(username) {
        const [rows] = await db.query(
            `SELECT * FROM users WHERE username = ? LIMIT 1`,
            [username]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CHECK EXISTS
    =========================================================*/
    async exists(username, email, phone) {
        const [rows] = await db.query(
            `SELECT user_id, username, email, phone FROM users
             WHERE username = ? OR email = ? OR phone = ? LIMIT 1`,
            [username, email, phone]
        );
        return rows[0] || null;
    }

    async existsByEmail(email) {
        const [rows] = await db.query(`SELECT 1 FROM users WHERE email = ? LIMIT 1`, [email]);
        return rows.length > 0;
    }

    async existsByUsername(username) {
        const [rows] = await db.query(`SELECT 1 FROM users WHERE username = ? LIMIT 1`, [username]);
        return rows.length > 0;
    }

    async existsByPhone(phone) {
        const [rows] = await db.query(`SELECT 1 FROM users WHERE phone = ? LIMIT 1`, [phone]);
        return rows.length > 0;
    }

    /*=========================================================
        CREATE USER
    =========================================================*/
    async create(data) {
        const [result] = await db.query(
            `
            INSERT INTO users
            (username, full_name, phone, address, email, password, user_avatar,
             role, status, email_verified, email_verified_at, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                data.username, data.full_name, data.phone, data.address || "",
                data.email, data.password, data.user_avatar || null,
                data.role || "customer", data.status || "active",
                data.email_verified || 0, data.email_verified_at || null,
                data.points || 0
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
            UPDATE users SET
                username = ?, full_name = ?, phone = ?, address = ?, email = ?,
                user_avatar = COALESCE(?, user_avatar), updated_at = NOW()
            WHERE user_id = ?
            `,
            [data.username, data.full_name, data.phone, data.address, data.email, data.user_avatar, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE AVATAR
    =========================================================*/
    async updateAvatar(userId, avatarUrl) {
        const [result] = await db.query(
            `UPDATE users SET user_avatar = ?, updated_at = NOW() WHERE user_id = ?`,
            [avatarUrl, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE PASSWORD
    =========================================================*/
    async updatePassword(userId, hashedPassword) {
        const [result] = await db.query(
            `UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?`,
            [hashedPassword, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE ROLE
    =========================================================*/
    async updateRole(userId, role) {
        const [result] = await db.query(
            `UPDATE users SET role = ?, updated_at = NOW() WHERE user_id = ?`,
            [role, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE STATUS
    =========================================================*/
    async updateStatus(userId, status) {
        const [result] = await db.query(
            `UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?`,
            [status, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE EMAIL VERIFIED
    =========================================================*/
    async updateEmailVerified(userId, verified = true) {
        const [result] = await db.query(
            `UPDATE users SET email_verified = ?, email_verified_at = ?, updated_at = NOW() WHERE user_id = ?`,
            [verified ? 1 : 0, verified ? new Date() : null, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE EMAIL
    =========================================================*/
    async updateEmail(userId, email) {
        const [result] = await db.query(
            `UPDATE users SET email = ?, email_verified = 0, email_verified_at = NULL, updated_at = NOW() WHERE user_id = ?`,
            [email, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE LAST LOGIN
    =========================================================*/
    async updateLastLogin(userId, ipAddress = null) {
        const [result] = await db.query(
            `UPDATE users SET last_login_at = NOW(), last_login_ip = ?, updated_at = NOW() WHERE user_id = ?`,
            [ipAddress, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        RESET POINTS
    =========================================================*/
    async resetPoints(userId) {
        const [result] = await db.query(
            `UPDATE users SET points = 0, updated_at = NOW() WHERE user_id = ?`,
            [userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE USER
    =========================================================*/
    async delete(userId) {
        const [result] = await db.query(`DELETE FROM users WHERE user_id = ?`, [userId]);
        return result.affectedRows;
    }

    /*=========================================================
        GET BOOKINGS BY USER
    =========================================================*/
    async getBookingsByUser(userId, from = null, to = null) {
        let dateCondition = "";
        const params = [userId];

        if (from) { dateCondition += " AND DATE(b.booking_date) >= ?"; params.push(from); }
        if (to) { dateCondition += " AND DATE(b.booking_date) <= ?"; params.push(to); }

        const [rows] = await db.query(
            `
            SELECT
                b.booking_id AS bookingId, b.total_amount AS totalAmount,
                b.status, b.booking_date AS bookingDate,
                m.title AS movieTitle, m.movie_poster AS moviePoster,
                c.cinema_name AS cinemaName, r.room_name AS roomName,
                s.start_time AS startTime,
                DATE_FORMAT(s.start_time, '%%d/%%m/%%Y') AS selectedDate,
                DATE_FORMAT(s.start_time, '%%H:%%i') AS startTimeDisplay,
                DATE_FORMAT(b.booking_date, '%%d/%%m/%%Y %%H:%%i') AS bookingDateFull,
                GROUP_CONCAT(CONCAT(st.seat_row, st.seat_number) ORDER BY st.seat_row, st.seat_number SEPARATOR ', ') AS seatDisplay,
                CONCAT('PIN-', LPAD(b.booking_id, 6, '0')) AS ticketPIN
            FROM bookings b
            INNER JOIN showtimes s ON b.showtime_id = s.showtime_id
            INNER JOIN movies m ON s.movie_id = m.movie_id
            INNER JOIN rooms r ON s.room_id = r.room_id
            INNER JOIN cinemas c ON r.cinema_id = c.cinema_id
            LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
            LEFT JOIN seats st ON bd.seat_id = st.seat_id
            WHERE b.user_id = ? ${dateCondition}
            GROUP BY b.booking_id
            ORDER BY b.booking_date DESC
            `,
            params
        );
        return rows;
    }

    /*=========================================================
        CLEAR BOOKINGS
    =========================================================*/
    async clearBookingsByUser(userId) {
        const [result] = await db.query(`DELETE FROM bookings WHERE user_id = ?`, [userId]);
        await db.query(`UPDATE users SET points = 0 WHERE user_id = ?`, [userId]);
        return result.affectedRows;
    }

    /*=========================================================
        🔐 PIN MANAGEMENT
    =========================================================*/
    async updatePinHash(userId, pinHash) {
        const [result] = await db.query(
            `UPDATE users SET pin_hash = ? WHERE user_id = ?`,
            [pinHash, userId]
        );
        return result.affectedRows;
    }

    async getPinHash(userId) {
        const [rows] = await db.query(
            `SELECT pin_hash FROM users WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        return rows[0]?.pin_hash || null;
    }
}

module.exports = new UserRepository();
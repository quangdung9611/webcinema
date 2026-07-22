const db = require("../Config/db");

class UserRepository {

    /*=========================================================
        FIND ALL USERS
    =========================================================*/
    async findAll() {
        const [rows] = await db.query(
            `
            SELECT
                user_id,
                username,
                full_name,
                email,
                avatar,
                phone,
                role,
                status,
                email_verified,
                address,
                points,
                last_login_at,
                last_login_ip,
                created_at,
                updated_at
            FROM users
            ORDER BY user_id DESC
            `
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
                avatar,
                phone,
                address,
                password,
                role,
                status,
                email_verified,
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
                avatar,
                phone,
                address,
                role,
                status,
                email_verified,
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
                avatar,
                password,
                phone,
                address,
                role,
                status,
                email_verified,
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
                avatar,
                password,
                phone,
                address,
                role,
                status,
                email_verified,
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
        FIND BASIC USER (không cần avatar)
    =========================================================*/
    async findBasicById(userId) {
        const [rows] = await db.query(
            `
            SELECT
                user_id,
                password,
                role,
                status,
                email_verified
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CHECK USER EXISTS (không cần avatar)
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
            WHERE username = ?
                OR email = ?
                OR phone = ?
            LIMIT 1
            `,
            [username, email, phone]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CHECK EMAIL EXISTS
    =========================================================*/
    async existsByEmail(email) {
        const [rows] = await db.query(
            `
            SELECT 1
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );
        return rows.length > 0;
    }

    /*=========================================================
        CHECK USERNAME EXISTS
    =========================================================*/
    async existsByUsername(username) {
        const [rows] = await db.query(
            `
            SELECT 1
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );
        return rows.length > 0;
    }

    /*=========================================================
        CHECK PHONE EXISTS
    =========================================================*/
    async existsByPhone(phone) {
        const [rows] = await db.query(
            `
            SELECT 1
            FROM users
            WHERE phone = ?
            LIMIT 1
            `,
            [phone]
        );
        return rows.length > 0;
    }

    /*=========================================================
        CREATE USER (thêm avatar mặc định null)
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
                role,
                status,
                email_verified,
                points
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                user.username,
                user.full_name,
                user.phone,
                user.address || "",
                user.email,
                user.password,
                user.role || "customer",
                user.status || "active",
                user.email_verified || 0,
                user.points || 0
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE PROFILE (bao gồm avatar)
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
                avatar = ?,
                updated_at = NOW()
            WHERE user_id = ?
            `,
            [
                data.username,
                data.full_name,
                data.phone,
                data.address,
                data.email,
                data.avatar || null,
                userId
            ]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE AVATAR (riêng biệt, dùng cho upload)
    =========================================================*/
    async updateAvatar(userId, avatarUrl) {
        const [result] = await db.query(
            `
            UPDATE users
            SET avatar = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [avatarUrl, userId]
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
            SET password = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [hashedPassword, userId]
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
            SET role = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [role, userId]
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
            SET status = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [status, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE EMAIL VERIFIED
    =========================================================*/
    async updateEmailVerified(userId, verified = true) {
        const [result] = await db.query(
            `
            UPDATE users
            SET email_verified = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [verified ? 1 : 0, userId]
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
            SET email = ?, email_verified = 0, updated_at = NOW()
            WHERE user_id = ?
            `,
            [email, userId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        UPDATE LAST LOGIN
    =========================================================*/
    async updateLastLogin(userId, ipAddress = null) {
        const [result] = await db.query(
            `
            UPDATE users
            SET last_login_at = NOW(), last_login_ip = ?, updated_at = NOW()
            WHERE user_id = ?
            `,
            [ipAddress, userId]
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
            SET points = 0, updated_at = NOW()
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
}

module.exports = new UserRepository();
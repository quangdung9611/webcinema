const db = require("../Config/db");

class OtpRepository {

    /*=========================================================
        CREATE OTP LOG
    =========================================================*/
    async create(data) {
        const {
            email,
            purpose,
            otp,
            status = "sent",
            ip_address,
            user_agent
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO otp_logs
            (
                email,
                purpose,
                otp,
                status,
                ip_address,
                user_agent,
                created_at
            )
            VALUES
            (
                ?, ?, ?, ?, ?, ?, NOW()
            )
            `,
            [
                email,
                purpose,
                otp || null,
                status,
                ip_address || null,
                user_agent || null
            ]
        );

        return result.insertId;
    }

    /*=========================================================
        FIND LATEST OTP LOG
    =========================================================*/
    async findLatest(email, purpose) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM otp_logs
            WHERE email = ?
              AND purpose = ?
            ORDER BY otp_id DESC
            LIMIT 1
            `,
            [email, purpose]
        );

        return rows[0] || null;
    }

    /*=========================================================
        FIND BY OTP
    =========================================================*/
    async findByOTP(email, purpose, otp) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM otp_logs
            WHERE email = ?
              AND purpose = ?
              AND otp = ?
            ORDER BY otp_id DESC
            LIMIT 1
            `,
            [email, purpose, otp]
        );

        return rows[0] || null;
    }

    /*=========================================================
        EXPIRE PREVIOUS OTP LOGS
    =========================================================*/
    async expirePreviousOtps(email, purpose) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'expired'
            WHERE email = ?
              AND purpose = ?
              AND status = 'sent'
            `,
            [email, purpose]
        );
    }

    /*=========================================================
        MARK VERIFIED
    =========================================================*/
    async markVerified(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'verified',
                verified_at = NOW()
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK USED
    =========================================================*/
    async markUsed(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'used'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK FAILED
    =========================================================*/
    async markFailed(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'failed'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK EXPIRED
    =========================================================*/
    async markExpired(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'expired'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK RESENT
    =========================================================*/
    async markResent(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'resent'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK LOCKED
    =========================================================*/
    async markLocked(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'locked'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        MARK INVALIDATED
    =========================================================*/
    async markInvalidated(otpId) {
        await db.query(
            `
            UPDATE otp_logs
            SET status = 'invalidated'
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /*=========================================================
        DELETE OTP LOGS BY EMAIL
    =========================================================*/
    async deleteByEmail(email, purpose) {
        await db.query(
            `
            DELETE FROM otp_logs
            WHERE email = ?
              AND purpose = ?
            `,
            [email, purpose]
        );
    }

    /*=========================================================
        COUNT RECENT OTPS
    =========================================================*/
    async countRecentOtps(email, minutes = 1) {
        const [rows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM otp_logs
            WHERE email = ?
              AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
            `,
            [email, minutes]
        );

        return rows[0].total;
    }

    /*=========================================================
        GET OTP LOGS BY EMAIL
    =========================================================*/
    async getLogsByEmail(email, purpose = null, limit = 50) {
        let query = `
            SELECT *
            FROM otp_logs
            WHERE email = ?
        `;
        const params = [email];

        if (purpose) {
            query += ` AND purpose = ?`;
            params.push(purpose);
        }

        query += ` ORDER BY otp_id DESC LIMIT ?`;
        params.push(limit);

        const [rows] = await db.query(query, params);
        return rows;
    }

    /*=========================================================
        CLEANUP OLD LOGS
    =========================================================*/
    async cleanupOldLogs(days = 90) {
        const [result] = await db.query(
            `
            DELETE FROM otp_logs
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `,
            [days]
        );

        return result.affectedRows;
    }

}

module.exports = new OtpRepository();
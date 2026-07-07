const db = require('../Config/db');
const Otp = require('../utils/Otp');

class OtpService {

    /* =========================================================
        CREATE OTP
    ========================================================= */
    static async createOTP(email, purpose = 'PAYMENT') {

        const otp = Otp.generate6();

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.execute(
            `
            INSERT INTO otp_logs
            (
                email,
                otp,
                purpose,
                expires_at,
                send_count,
                failed_attempts
            )
            VALUES (?, ?, ?, ?, 1, 0)
            `,
            [email, otp, purpose, expiresAt]
        );

        return otp;
    }

    /* =========================================================
        RESEND OTP
    ========================================================= */
    static async resendOTP(email, purpose = 'PAYMENT') {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM otp_logs
            WHERE email = ? AND purpose = ? AND is_used = 0
            ORDER BY otp_id DESC
            LIMIT 1
            `,
            [email, purpose]
        );

        if (!rows.length) {
            throw new Error('Không tìm thấy OTP để gửi lại.');
        }

        const record = rows[0];

        const diff = Date.now() - new Date(record.updated_at || record.created_at).getTime();

        if (diff < 30000) {
            throw new Error('Vui lòng đợi 30 giây trước khi gửi lại OTP.');
        }

        if (record.send_count >= 3) {
            throw new Error('Bạn đã vượt quá số lần gửi OTP.');
        }

        const newOTP = Otp.generate6();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.execute(
            `
            UPDATE otp_logs
            SET
                otp = ?,
                expires_at = ?,
                send_count = send_count + 1,
                failed_attempts = 0,
                updated_at = NOW()
            WHERE otp_id = ?
            `,
            [newOTP, expiresAt, record.otp_id]
        );

        return newOTP;
    }

    /* =========================================================
        VERIFY OTP
    ========================================================= */
    static async verifyOTP(email, otp, purpose = 'PAYMENT') {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM otp_logs
            WHERE email = ? AND purpose = ? AND is_used = 0
            ORDER BY otp_id DESC
            LIMIT 1
            `,
            [email, purpose]
        );

        if (!rows.length) {
            return { success: false, message: 'Không tìm thấy OTP.' };
        }

        const record = rows[0];

        if (new Date(record.expires_at) < new Date()) {
            return { success: false, code: 'OTP_EXPIRED', message: 'OTP đã hết hạn.' };
        }

        if (record.failed_attempts >= 5) {
            return { success: false, code: 'OTP_LOCKED', message: 'OTP đã bị khóa.' };
        }

        if (record.otp !== otp) {

            await db.execute(
                `
                UPDATE otp_logs
                SET failed_attempts = failed_attempts + 1
                WHERE otp_id = ?
                `,
                [record.otp_id]
            );

            return { success: false, code: 'OTP_INVALID', message: 'OTP không đúng.' };
        }

        return {
            success: true,
            data: record
        };
    }

    /* =========================================================
        MARK USED
    ========================================================= */
    static async markUsed(otpId) {

        await db.execute(
            `
            UPDATE otp_logs
            SET is_used = 1, updated_at = NOW()
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /* =========================================================
        MARK VERIFIED
    ========================================================= */
    static async markVerified(otpId) {

        await db.execute(
            `
            UPDATE otp_logs
            SET verified = 1, updated_at = NOW()
            WHERE otp_id = ?
            `,
            [otpId]
        );
    }

    /* =========================================================
        DELETE OTP
    ========================================================= */
    static async deleteOTP(email, purpose = 'PAYMENT') {

        await db.execute(
            `
            DELETE FROM otp_logs
            WHERE email = ? AND purpose = ?
            `,
            [email, purpose]
        );
    }

    /* =========================================================
        CLEAN EXPIRED OTP
    ========================================================= */
    static async clearExpiredOTP() {

        await db.execute(
            `
            DELETE FROM otp_logs
            WHERE expires_at < NOW()
            `
        );
    }
}

module.exports = OtpService;
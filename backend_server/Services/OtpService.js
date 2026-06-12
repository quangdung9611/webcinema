const db = require('../Config/db');

/**
 * Sinh OTP 6 số
 */
exports.generateOTP = () => {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
};

/**
 * Tạo OTP mới
 */
exports.createOTP = async (
    email,
    purpose = 'PAYMENT'
) => {

    const otp = exports.generateOTP();

    const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000
    );

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
        [
            email,
            otp,
            purpose,
            expiresAt
        ]
    );

    return otp;
};

/**
 * Gửi lại OTP
 */
exports.resendOTP = async (
    email,
    purpose = 'PAYMENT'
) => {

    const [rows] = await db.execute(
        `
        SELECT *
        FROM otp_logs
        WHERE email = ?
        AND purpose = ?
        AND is_used = 0
        ORDER BY otp_id DESC
        LIMIT 1
        `,
        [
            email,
            purpose
        ]
    );

    if (!rows.length) {
        throw new Error(
            'Không tìm thấy OTP để gửi lại.'
        );
    }

    const otpRecord = rows[0];

    const diff =
        Date.now() -
        new Date(
            otpRecord.updated_at ||
            otpRecord.created_at
        ).getTime();

    // Chống spam 30 giây
    if (diff < 30000) {

        throw new Error(
            'Vui lòng đợi 30 giây trước khi gửi lại OTP.'
        );

    }

    // Tối đa 3 lần gửi
    if (otpRecord.send_count >= 3) {

        throw new Error(
            'Bạn đã vượt quá số lần gửi OTP.'
        );

    }

    const newOTP =
        exports.generateOTP();

    const expiresAt =
        new Date(
            Date.now() +
            5 * 60 * 1000
        );

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
        [
            newOTP,
            expiresAt,
            otpRecord.otp_id
        ]
    );

    return newOTP;
};

/**
 * Xác thực OTP
 */
exports.verifyOTP = async (
    email,
    otp,
    purpose = 'PAYMENT'
) => {

    const [rows] = await db.execute(
        `
        SELECT *
        FROM otp_logs
        WHERE email = ?
        AND purpose = ?
        AND is_used = 0
        ORDER BY otp_id DESC
        LIMIT 1
        `,
        [
            email,
            purpose
        ]
    );

    if (!rows.length) {

        return {
            success: false,
            message:
                'Không tìm thấy OTP.'
        };

    }

    const otpRecord = rows[0];

    // OTP hết hạn
    if (
        new Date(
            otpRecord.expires_at
        ) < new Date()
    ) {

        return {
            success: false,
            code: 'OTP_EXPIRED',
            message:
                'OTP đã hết hạn.'
        };

    }

    // OTP bị khóa
    if (
        otpRecord.failed_attempts >= 5
    ) {

        return {
            success: false,
            code: 'OTP_LOCKED',
            message:
                'OTP đã bị khóa do nhập sai quá nhiều lần.'
        };

    }

    // OTP sai
    if (
        otpRecord.otp !== otp
    ) {

        await db.execute(
            `
            UPDATE otp_logs
            SET failed_attempts =
                failed_attempts + 1
            WHERE otp_id = ?
            `,
            [
                otpRecord.otp_id
            ]
        );

        return {
            success: false,
            code: 'OTP_INVALID',
            message:
                'OTP không chính xác.'
        };

    }

    return {
        success: true,
        data: otpRecord
    };
};

/**
 * Đánh dấu OTP đã dùng
 */
exports.markUsed = async (
    otpId
) => {

    await db.execute(
        `
        UPDATE otp_logs
        SET
            is_used = 1,
            updated_at = NOW()
        WHERE otp_id = ?
        `,
        [otpId]
    );

};

/**
 * Xóa OTP theo email
 */
exports.deleteOTP = async (
    email,
    purpose = 'PAYMENT'
) => {

    await db.execute(
        `
        DELETE FROM otp_logs
        WHERE email = ?
        AND purpose = ?
        `,
        [
            email,
            purpose
        ]
    );

};

/**
 * Xóa OTP đã hết hạn
 */
exports.clearExpiredOTP =
    async () => {

    await db.execute(
        `
        DELETE FROM otp_logs
        WHERE expires_at < NOW()
        `
    );

};

/* =========================================================
MARK OTP VERIFIED
========================================================= */

exports.markVerified = async (
    otpId
) => {

    await db.execute(
        `
        UPDATE otp_logs
        SET
            verified = 1,
            updated_at = NOW()
        WHERE otp_id = ?
        `,
        [otpId]
    );

};
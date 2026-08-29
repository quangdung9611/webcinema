const RedisService = require("./RedisService");
const Otp = require("../utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

// ============================================================
// OTP CONFIG
// ============================================================

const OTP_EXPIRE_SECONDS =
    parseInt(
        process.env.OTP_EXPIRE_SECONDS,
        10
    ) || 300;

const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_SECONDS = 300;

const OTP_SEND_LIMIT = 3;
const OTP_SEND_WINDOW_SECONDS = 300;

// ============================================================
// PURPOSE
// ============================================================

const PURPOSE = {
    REGISTER: 'REGISTER',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    CHANGE_EMAIL: 'CHANGE_EMAIL',
    VERIFY_EMAIL: 'VERIFY_EMAIL',
    PAYMENT: 'PAYMENT',
    RESET_PASSWORD: 'RESET_PASSWORD',
    BOOKING: 'BOOKING',
    VERIFY_PHONE: 'VERIFY_PHONE',
    FORGOT_PIN: 'FORGOT_PIN'
};

class OtpService {

    // ============================================================
    // CREATE OTP
    // ============================================================

    async createOTP(
        email,
        purpose
    ) {
        if (!purpose) {
            throw new Error(
                "Purpose is required"
            );
        }

        email =
            String(email || '')
                .trim();

        if (!email) {
            throw new Error(
                "Email is required"
            );
        }

        console.log(
            `🔐 [CREATE OTP] email: "${email}", purpose: "${purpose}"`
        );

        // ========================================================
        // KIỂM TRA OTP LOCK
        // ========================================================

        const lockInfo =
            await RedisService.getOTPLockInfo(
                email,
                purpose
            );

        if (
            lockInfo &&
            lockInfo.isLocked
        ) {
            throw {
                statusCode: 429,
                code: "OTP_LOCKED",
                message:
                    "OTP đang bị khóa do nhập sai quá nhiều lần",
                data: {
                    remainingSeconds:
                        lockInfo.remainingSeconds,
                    lockedUntil:
                        lockInfo.lockedUntil
                }
            };
        }

        // ========================================================
        // RATE LIMIT GỬI OTP
        // ========================================================

        const rateLimit =
            await RedisService.checkRateLimit(
                email,
                purpose,
                OTP_SEND_LIMIT,
                OTP_SEND_WINDOW_SECONDS
            );

        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                code: "OTP_RATE_LIMITED",
                message:
                    rateLimit.message,
                data: {
                    remainingSeconds:
                        rateLimit.remainingSeconds,
                    maxAttempts:
                        OTP_SEND_LIMIT
                }
            };
        }

        // ========================================================
        // GENERATE OTP
        // ========================================================

        const otpCode =
            Otp.generate6();

        console.log(
            `📤 Generated OTP: ${otpCode}`
        );

        // ========================================================
        // XÓA OTP CŨ
        //
        // Chỉ xóa OTP + attempts.
        //
        // KHÔNG xóa OTP LOCK ở đây vì
        // lock đã được kiểm tra phía trên.
        // ========================================================

        await RedisService.deleteOTP(
            email,
            purpose
        );

        // ========================================================
        // LƯU OTP
        // ========================================================

        await RedisService.saveOTP(
            email,
            purpose,
            otpCode,
            OTP_EXPIRE_SECONDS
        );

        // ========================================================
        // LOG DATABASE
        // ========================================================

        const otpId =
            await OtpRepository.create({
                email,
                purpose,
                status: "sent",
                ip_address: null,
                user_agent: null
            });

        // ========================================================
        // LẤY TTL THỰC TẾ
        // ========================================================

        const otpKey =
            `otp:${email}:${purpose}`;

        const ttl =
            await RedisService.getTTL(
                otpKey
            );

        return {
            success: true,
            otp: otpCode,
            otpId,
            expiresIn:
                ttl > 0
                    ? ttl
                    : OTP_EXPIRE_SECONDS
        };
    }

    // ============================================================
    // VERIFY OTP
    // ============================================================

    async verifyOTP(
        email,
        otp,
        purpose,
        deleteAfterVerify = true
    ) {
        if (!purpose) {
            throw new Error(
                "Purpose is required"
            );
        }

        email =
            String(email || '')
                .trim();

        const userOTP =
            String(otp || '')
                .trim();

        console.log(
            `🔑 [VERIFY OTP] email: "${email}", purpose: "${purpose}", received otp: "${userOTP}"`
        );

        // ========================================================
        // KIỂM TRA LOCK TRƯỚC
        // ========================================================

        const lockInfo =
            await RedisService.getOTPLockInfo(
                email,
                purpose
            );

        if (
            lockInfo &&
            lockInfo.isLocked
        ) {
            return {
                success: false,
                code: "OTP_LOCKED",
                message:
                    "OTP đã bị khóa do nhập sai quá nhiều lần",
                data: {
                    remainingSeconds:
                        lockInfo.remainingSeconds,
                    lockedUntil:
                        lockInfo.lockedUntil
                }
            };
        }

        // ========================================================
        // LẤY OTP
        // ========================================================

        const savedOTP =
            String(
                await RedisService.getOTP(
                    email,
                    purpose
                ) || ''
            ).trim();

        // ========================================================
        // OTP KHÔNG TỒN TẠI
        // ========================================================

        if (!savedOTP) {
            return {
                success: false,
                code: "OTP_NOT_FOUND",
                message:
                    "OTP không tồn tại hoặc đã hết hạn",
                data: {
                    expiresIn: 0
                }
            };
        }

        // ========================================================
        // OTP SAI
        // ========================================================

        if (
            savedOTP !== userOTP
        ) {
            const attempts =
                await RedisService
                    .incrementOTPAttempts(
                        email,
                        purpose,
                        OTP_EXPIRE_SECONDS
                    );

            const latestLog =
                await OtpRepository.findLatest(
                    email,
                    purpose
                );

            if (
                latestLog?.otp_id
            ) {
                await OtpRepository.markFailed(
                    latestLog.otp_id
                );
            }

            // ====================================================
            // ĐẠT 5 LẦN → LOCK
            // ====================================================

            if (
                attempts >=
                OTP_MAX_ATTEMPTS
            ) {
                /*
                 * Xóa OTP và attempts.
                 *
                 * QUAN TRỌNG:
                 * Không xóa OTP LOCK.
                 */
                await RedisService.deleteOTP(
                    email,
                    purpose
                );

                const lock =
                    await RedisService
                        .createOTPLock(
                            email,
                            purpose,
                            OTP_LOCK_SECONDS
                        );

                return {
                    success: false,
                    code: "OTP_LOCKED",
                    message:
                        "Bạn đã nhập sai 5 lần. OTP đã bị khóa. Vui lòng đợi hết thời gian khóa để thử lại.",
                    data: {
                        remainingSeconds:
                            lock.remainingSeconds,
                        lockedUntil:
                            lock.lockedUntil,
                        lockDuration:
                            OTP_LOCK_SECONDS,
                        attempts:
                            attempts,
                        maxAttempts:
                            OTP_MAX_ATTEMPTS
                    }
                };
            }

            // ====================================================
            // OTP SAI NHƯNG CHƯA LOCK
            // ====================================================

            return {
                success: false,
                code: "OTP_INVALID",
                message:
                    "OTP không đúng",
                data: {
                    attempts,
                    remainingAttempts:
                        Math.max(
                            0,
                            OTP_MAX_ATTEMPTS -
                                attempts
                        ),
                    maxAttempts:
                        OTP_MAX_ATTEMPTS
                }
            };
        }

        // ========================================================
        // OTP ĐÚNG
        // ========================================================

        if (
            deleteAfterVerify
        ) {
            await RedisService.deleteOTP(
                email,
                purpose
            );

            /*
             * Nếu verify thành công thì
             * lock cũ không được tồn tại.
             */
            await RedisService.deleteOTPLock(
                email,
                purpose
            );

            const latestLog =
                await OtpRepository.findLatest(
                    email,
                    purpose
                );

            if (
                latestLog?.otp_id
            ) {
                await OtpRepository.markVerified(
                    latestLog.otp_id
                );
            }

            await OtpRepository.create({
                email,
                purpose,
                status: "verified",
                ip_address: null,
                user_agent: null
            });
        } else {
            /*
             * Không xóa OTP.
             *
             * Chỉ reset attempts.
             */
            await RedisService.resetOTPAttempts(
                email,
                purpose
            );
        }

        return {
            success: true,
            message:
                "Xác thực OTP thành công"
        };
    }

    // ============================================================
    // DELETE OTP
    // ============================================================

    async deleteOTP(
        email,
        purpose
    ) {
        if (!purpose) {
            throw new Error(
                "Purpose is required"
            );
        }

        email =
            String(email || '')
                .trim();

        /*
         * Chỉ xóa OTP + attempts.
         *
         * Không xóa lock.
         */
        await RedisService.deleteOTP(
            email,
            purpose
        );

        const latestLog =
            await OtpRepository.findLatest(
                email,
                purpose
            );

        if (
            latestLog &&
            latestLog.status ===
                'sent'
        ) {
            await OtpRepository.markExpired(
                latestLog.otp_id
            );
        }

        await OtpRepository.create({
            email,
            purpose,
            status: "deleted",
            ip_address: null,
            user_agent: null
        });

        return {
            success: true,
            message:
                "OTP đã được xóa"
        };
    }

    // ============================================================
    // GET OTP TTL
    // ============================================================

    async getOtpTTL(
        email,
        purpose
    ) {
        if (!purpose) {
            throw new Error(
                "Purpose is required"
            );
        }

        email =
            String(email || '')
                .trim();

        // ========================================================
        // Nếu đang lock thì OTP TTL = 0
        // ========================================================

        const lockInfo =
            await RedisService.getOTPLockInfo(
                email,
                purpose
            );

        if (
            lockInfo &&
            lockInfo.isLocked
        ) {
            return {
                exists: false,
                expiresIn: 0,
                purpose,
                locked: true,
                remainingSeconds:
                    lockInfo.remainingSeconds,
                lockedUntil:
                    lockInfo.lockedUntil
            };
        }

        // ========================================================
        // OTP TTL
        // ========================================================

        const otpKey =
            `otp:${email}:${purpose}`;

        const ttl =
            await RedisService.getTTL(
                otpKey
            );

        const otp =
            await RedisService.getOTP(
                email,
                purpose
            );

        return {
            exists: Boolean(otp),
            expiresIn:
                ttl > 0
                    ? ttl
                    : 0,
            purpose,
            locked: false,
            remainingSeconds: 0,
            lockedUntil: null
        };
    }

    // ============================================================
    // GET OTP LOCK INFO
    // ============================================================

    async getOtpLockInfo(
        email,
        purpose
    ) {
        if (!purpose) {
            throw new Error(
                "Purpose is required"
            );
        }

        email =
            String(email || '')
                .trim();

        return await RedisService
            .getOTPLockInfo(
                email,
                purpose
            );
    }

    // ============================================================
    // RESEND OTP
    //
    // Controller có thể gọi createOTP()
    // thay vì dùng logic riêng.
    // ============================================================

    async resendOTP(
        email,
        purpose
    ) {
        return await this.createOTP(
            email,
            purpose
        );
    }

    // ============================================================
    // CLEANUP OLD LOGS
    // ============================================================

    async cleanupOldLogs(
        days = 90
    ) {
        const deleted =
            await OtpRepository
                .cleanupOldLogs(
                    days
                );

        return {
            success: true,
            deleted
        };
    }
}

const otpService =
    new OtpService();

module.exports =
    otpService;

module.exports.PURPOSE =
    PURPOSE;
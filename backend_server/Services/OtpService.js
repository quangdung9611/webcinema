/*=========================================================
    DEPENDENCIES
=========================================================*/

const RedisService = require("./RedisService");
const Otp = require("../utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

/*=========================================================
    HẰNG SỐ PURPOSE
=========================================================*/

const PURPOSE = {
    REGISTER: 'REGISTER',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    CHANGE_EMAIL: 'CHANGE_EMAIL',
    VERIFY_EMAIL: 'VERIFY_EMAIL',
    PAYMENT: 'PAYMENT',
    RESET_PASSWORD: 'RESET_PASSWORD',
    BOOKING: 'BOOKING',
    VERIFY_PHONE: 'VERIFY_PHONE'
};

/*=========================================================
    OTP SERVICE
=========================================================*/

class OtpService {

    /*=========================================================
        CREATE OTP
    =========================================================*/
    async createOTP(email, purpose) {
        if (!purpose) {
            throw new Error("Purpose is required");
        }

        email = email.trim();
        console.log(`🔐 [CREATE OTP] email: "${email}", purpose: "${purpose}"`);

        // Rate limit
        const rateLimit = await RedisService.checkRateLimit(email, purpose, 3, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: rateLimit.message
            };
        }

        // Generate OTP
        const otpCode = Otp.generate6();
        console.log(`📤 Generated OTP: ${otpCode}`);

        // Lưu vào Redis
        await RedisService.saveOTP(email, purpose, otpCode, 300);

        // Lưu vào Database - lấy otp_id để cập nhật sau
        const otpId = await OtpRepository.create({
            email,
            purpose,
            status: "sent",
            ip_address: null,
            user_agent: null
        });

        console.log(`💾 Saved to DB with otp_id: ${otpId}`);

        return {
            success: true,
            otp: otpCode,
            otpId: otpId
        };
    }

    /*=========================================================
        VERIFY OTP
    =========================================================*/
    async verifyOTP(email, otp, purpose) {
        if (!purpose) {
            throw new Error("Purpose is required");
        }

        email = email.trim();
        console.log(`🔑 [VERIFY OTP] email: "${email}", purpose: "${purpose}", received otp: "${otp}"`);

        // Kiểm tra lock
        const isLocked = await RedisService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            console.log(`🔒 OTP locked for ${email}`);
            return {
                success: false,
                code: "OTP_LOCKED",
                message: "OTP đã bị khóa do nhập sai quá nhiều lần"
            };
        }

        // Lấy OTP từ Redis
        const savedOTP = await RedisService.getOTP(email, purpose);
        console.log(`📦 OTP from Redis: "${savedOTP}"`);

        if (!savedOTP) {
            console.log(`❌ OTP not found for ${email}:${purpose}`);
            return {
                success: false,
                code: "OTP_NOT_FOUND",
                message: "OTP không tồn tại hoặc đã hết hạn"
            };
        }

        // Lấy latest otp_id từ DB để cập nhật
        const latestLog = await OtpRepository.findLatest(email, purpose);
        const otpId = latestLog?.otp_id;

        if (savedOTP !== otp) {
            const attempts = await RedisService.incrementOTPAttempts(email, purpose, 300);
            console.log(`❌ OTP mismatch. Attempts: ${attempts}`);

            // Đánh dấu failed trong DB
            if (otpId) {
                await OtpRepository.markFailed(otpId);
            }

            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        // OTP đúng → xóa Redis, đánh dấu verified
        await RedisService.deleteOTP(email, purpose);
        console.log(`✅ OTP verified for ${email}`);

        if (otpId) {
            await OtpRepository.markVerified(otpId);
        }

        // Log thêm vào DB (tạo log verified)
        await OtpRepository.create({
            email,
            purpose,
            status: "verified",
            ip_address: null,
            user_agent: null
        });

        return {
            success: true,
            message: "Xác thực OTP thành công"
        };
    }

    /*=========================================================
        RESEND OTP
    =========================================================*/
    async resendOTP(email, purpose) {
        if (!purpose) {
            throw new Error("Purpose is required");
        }

        email = email.trim();
        console.log(`🔄 [RESEND OTP] email: "${email}", purpose: "${purpose}"`);

        // Cooldown 30s
        const cooldownKey = `otp:${email}:${purpose}:cooldown`;
        const lastSent = await RedisService.get(cooldownKey);
        if (lastSent) {
            const diff = Date.now() - Number(lastSent);
            if (diff < 30000) {
                throw {
                    statusCode: 429,
                    message: "Vui lòng đợi 30 giây trước khi gửi lại OTP"
                };
            }
        }

        // Giới hạn 3 lần resend
        const countKey = `otp:${email}:${purpose}:resend_count`;
        const count = Number(await RedisService.get(countKey) || 0);
        if (count >= 3) {
            throw {
                statusCode: 429,
                message: "Bạn đã vượt quá số lần gửi OTP"
            };
        }

        // Tạo OTP mới
        const otpCode = Otp.generate6();
        console.log(`📤 Resend OTP: ${otpCode}`);

        // Lưu vào Redis
        await RedisService.saveOTP(email, purpose, otpCode, 300);
        await RedisService.set(cooldownKey, Date.now().toString(), 30);
        await RedisService.increment(countKey);
        await RedisService.expire(countKey, 3600);

        // Lưu vào DB - đánh dấu resent
        const otpId = await OtpRepository.create({
            email,
            purpose,
            status: "resent",
            ip_address: null,
            user_agent: null
        });

        // Đánh dấu expired các OTP cũ
        await OtpRepository.expirePreviousOtps(email, purpose);

        return {
            success: true,
            otp: otpCode,
            otpId: otpId
        };
    }

    /*=========================================================
        DELETE OTP
    =========================================================*/
    async deleteOTP(email, purpose) {
        if (!purpose) {
            throw new Error("Purpose is required");
        }

        email = email.trim();
        console.log(`🗑️ [DELETE OTP] email: "${email}", purpose: "${purpose}"`);

        // Xóa Redis
        await RedisService.deleteOTP(email, purpose);

        // Đánh dấu expired trong DB
        const latestLog = await OtpRepository.findLatest(email, purpose);
        if (latestLog && latestLog.status === 'sent') {
            await OtpRepository.markExpired(latestLog.otp_id);
        }

        // Log xóa
        await OtpRepository.create({
            email,
            purpose,
            status: "deleted",
            ip_address: null,
            user_agent: null
        });

        return { success: true, message: "OTP đã được xóa" };
    }

    /*=========================================================
        CLEANUP OLD OTP LOGS
    =========================================================*/
    async cleanupOldLogs(days = 90) {
        const deleted = await OtpRepository.cleanupOldLogs(days);
        console.log(`🧹 Cleaned ${deleted} old OTP logs (older than ${days} days)`);
        return { success: true, deleted };
    }
}

// ✅ Export instance và PURPOSE
const otpService = new OtpService();
module.exports = otpService;
module.exports.PURPOSE = PURPOSE;
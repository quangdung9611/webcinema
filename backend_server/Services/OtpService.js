/*=========================================================
    DEPENDENCIES
=========================================================*/

const RedisService = require("./RedisService");
const Otp = require("../utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

/*=========================================================
    OTP SERVICE
=========================================================*/

class OtpService {

    /*=========================================================
        CREATE OTP - Dùng cho thanh toán/booking
    =========================================================*/
    async createPaymentOTP(email, purpose = "PAYMENT") {
        const rateLimit = await RedisService.checkRateLimit(email, purpose, 3, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: rateLimit.message
            };
        }

        const otpCode = Otp.generate6();
        await RedisService.saveOTP(email, purpose, otpCode, 300);

        await OtpRepository.create({
            email,
            purpose: purpose,
            status: "sent",
            ip_address: null,
            user_agent: null
        });

        return {
            success: true,
            otp: otpCode
        };
    }

    /*=========================================================
        ALIAS: createOTP (giữ tương thích code cũ)
    =========================================================*/
    async createOTP(email, purpose = "PAYMENT") {
        return await this.createPaymentOTP(email, purpose);
    }

    /*=========================================================
        VERIFY OTP
    =========================================================*/
    async verifyPaymentOTP(email, otp, purpose = "PAYMENT") {
        const isLocked = await RedisService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            return {
                success: false,
                code: "OTP_LOCKED",
                message: "OTP đã bị khóa do nhập sai quá nhiều lần"
            };
        }

        const savedOTP = await RedisService.getOTP(email, purpose);
        if (!savedOTP) {
            return {
                success: false,
                code: "OTP_NOT_FOUND",
                message: "OTP không tồn tại hoặc đã hết hạn"
            };
        }

        if (savedOTP !== otp) {
            const attempts = await RedisService.incrementOTPAttempts(email, purpose, 300);
            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        await RedisService.deleteOTP(email, purpose);

        await OtpRepository.create({
            email,
            purpose: purpose,
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
        ALIAS: verifyOTP
    =========================================================*/
    async verifyOTP(email, otp, purpose = "PAYMENT") {
        return await this.verifyPaymentOTP(email, otp, purpose);
    }

    /*=========================================================
        RESEND OTP
    =========================================================*/
    async resendOTP(email, purpose = "PAYMENT") {
        const cooldownKey = `otp:${email}:${purpose}:cooldown`;
        const lastSent = await RedisService.get(cooldownKey);
        
        if (lastSent) {
            const diff = Date.now() - parseInt(lastSent);
            if (diff < 30000) {
                throw {
                    statusCode: 429,
                    message: "Vui lòng đợi 30 giây trước khi gửi lại OTP"
                };
            }
        }

        const countKey = `otp:${email}:${purpose}:resend_count`;
        const count = await RedisService.get(countKey) || 0;
        
        if (parseInt(count) >= 3) {
            throw {
                statusCode: 429,
                message: "Bạn đã vượt quá số lần gửi OTP"
            };
        }

        const newOTP = Otp.generate6();
        await RedisService.saveOTP(email, purpose, newOTP, 300);
        await RedisService.set(cooldownKey, Date.now().toString(), 30);
        await RedisService.increment(countKey);
        await RedisService.expire(countKey, 3600);

        await OtpRepository.create({
            email,
            purpose: purpose,
            status: "resent",
            ip_address: null,
            user_agent: null
        });

        return {
            success: true,
            otp: newOTP
        };
    }

    /*=========================================================
        DELETE OTP
    =========================================================*/
    async deleteOTP(email, purpose = "PAYMENT") {
        await RedisService.deleteOTP(email, purpose);
        
        await OtpRepository.create({
            email,
            purpose: purpose,
            status: "deleted",
            ip_address: null,
            user_agent: null
        });
    }
}

module.exports = new OtpService();
/*=========================================================
    DEPENDENCIES
=========================================================*/

const RedisService = require("./RedisService");
const Otp = require("../Utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

/*=========================================================
    OTP SERVICE (Dùng chung Redis)
=========================================================*/

class OtpService {

    /*=========================================================
        CREATE OTP - Dùng cho thanh toán/booking
    =========================================================*/
    static async createPaymentOTP(email, purpose = "PAYMENT") {
        // 1. Check rate limit
        const rateLimit = await RedisService.checkRateLimit(email, purpose, 3, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: rateLimit.message
            };
        }

        // 2. Generate OTP
        const otpCode = Otp.generate6();

        // 3. Lưu vào Redis (TTL 5 phút)
        await RedisService.saveOTP(email, purpose, otpCode, 300);

        // 4. Log vào MySQL (lịch sử)
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
        VERIFY OTP - Dùng cho thanh toán/booking
    =========================================================*/
    static async verifyPaymentOTP(email, otp, purpose = "PAYMENT") {
        // 1. Check locked
        const isLocked = await RedisService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            return {
                success: false,
                code: "OTP_LOCKED",
                message: "OTP đã bị khóa do nhập sai quá nhiều lần"
            };
        }

        // 2. Get OTP từ Redis
        const savedOTP = await RedisService.getOTP(email, purpose);
        if (!savedOTP) {
            return {
                success: false,
                code: "OTP_NOT_FOUND",
                message: "OTP không tồn tại hoặc đã hết hạn"
            };
        }

        // 3. Verify OTP
        if (savedOTP !== otp) {
            const attempts = await RedisService.incrementOTPAttempts(email, purpose, 300);
            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        // 4. Xóa OTP khỏi Redis (dùng 1 lần)
        await RedisService.deleteOTP(email, purpose);

        // 5. Log vào MySQL
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
        VERIFY OTP - Dùng chung cho mọi purpose
    =========================================================*/
    static async verifyOTP(email, otp, purpose = "PAYMENT") {
        return await this.verifyPaymentOTP(email, otp, purpose);
    }

    /*=========================================================
        RESEND OTP - Dùng cho thanh toán/booking
    =========================================================*/
    static async resendOTP(email, purpose = "PAYMENT") {
        // 1. Check cooldown (30s)
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

        // 2. Check resend count (tối đa 3 lần)
        const countKey = `otp:${email}:${purpose}:resend_count`;
        const count = await RedisService.get(countKey) || 0;
        
        if (parseInt(count) >= 3) {
            throw {
                statusCode: 429,
                message: "Bạn đã vượt quá số lần gửi OTP"
            };
        }

        // 3. Generate OTP mới
        const newOTP = Otp.generate6();

        // 4. Lưu vào Redis
        await RedisService.saveOTP(email, purpose, newOTP, 300);
        await RedisService.set(cooldownKey, Date.now().toString(), 30);
        await RedisService.increment(countKey);
        await RedisService.expire(countKey, 3600);

        // 5. Log vào MySQL
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
    static async deleteOTP(email, purpose = "PAYMENT") {
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

module.exports = OtpService;
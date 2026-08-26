const RedisService = require("./RedisService");
const Otp = require("../utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

const PURPOSE = {
    REGISTER: 'REGISTER',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    CHANGE_EMAIL: 'CHANGE_EMAIL',
    VERIFY_EMAIL: 'VERIFY_EMAIL',
    PAYMENT: 'PAYMENT',
    RESET_PASSWORD: 'RESET_PASSWORD', // ✅ ĐÃ ĐÚNG
    BOOKING: 'BOOKING',
    VERIFY_PHONE: 'VERIFY_PHONE'
};

class OtpService {
    async createOTP(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔐 [CREATE OTP] email: "${email}", purpose: "${purpose}"`);

        const rateLimit = await RedisService.checkRateLimit(email, purpose, 3, 60);
        if (!rateLimit.allowed) {
            throw { statusCode: 429, message: rateLimit.message };
        }

        // 🔥 ĐẢM BẢO OTP LÀ CHUỖI SẠCH 6 SỐ (KHÔNG PHẢI OBJECT)
        const otpCode = Otp.generate6(); 
        console.log(`📤 Generated OTP: ${otpCode}`);

        // 🔥 XÓA OTP CŨ TRƯỚC KHI LƯU MỚI ĐỂ TRÁNH BỊ TRÙNG
        await RedisService.deleteOTP(email, purpose);
        await RedisService.saveOTP(email, purpose, otpCode, 300);
        const otpId = await OtpRepository.create({
            email,
            purpose,
            status: "sent",
            ip_address: null,
            user_agent: null
        });

        return { success: true, otp: otpCode, otpId };
    }

    async verifyOTP(email, otp, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔑 [VERIFY OTP] email: "${email}", purpose: "${purpose}", received otp: "${otp}"`);

        const isLocked = await RedisService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            return { success: false, code: "OTP_LOCKED", message: "OTP đã bị khóa do nhập sai quá nhiều lần" };
        }

        // 🔥 CHUYỂN VỀ STRING ĐỂ SO SÁNH CHÍNH XÁC
        const savedOTP = String(await RedisService.getOTP(email, purpose) || '').trim();
        const userOTP = String(otp || '').trim();

        if (!savedOTP) {
            return { success: false, code: "OTP_NOT_FOUND", message: "OTP không tồn tại hoặc đã hết hạn" };
        }

        if (savedOTP !== userOTP) {
            const attempts = await RedisService.incrementOTPAttempts(email, purpose, 300);
            const latestLog = await OtpRepository.findLatest(email, purpose);
            if (latestLog?.otp_id) await OtpRepository.markFailed(latestLog.otp_id);
            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        await RedisService.deleteOTP(email, purpose);
        const latestLog = await OtpRepository.findLatest(email, purpose);
        if (latestLog?.otp_id) await OtpRepository.markVerified(latestLog.otp_id);
        await OtpRepository.create({ email, purpose, status: "verified", ip_address: null, user_agent: null });

        return { success: true, message: "Xác thực OTP thành công" };
    }

    async deleteOTP(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        await RedisService.deleteOTP(email, purpose);
        const latestLog = await OtpRepository.findLatest(email, purpose);
        if (latestLog && latestLog.status === 'sent') {
            await OtpRepository.markExpired(latestLog.otp_id);
        }
        await OtpRepository.create({ email, purpose, status: "deleted", ip_address: null, user_agent: null });
        return { success: true, message: "OTP đã được xóa" };
    }

    async resendOTP() {
        throw new Error("Không hỗ trợ gửi lại OTP. Vui lòng bắt đầu lại giao dịch.");
    }

    async cleanupOldLogs(days = 90) {
        const deleted = await OtpRepository.cleanupOldLogs(days);
        return { success: true, deleted };
    }
}

const otpService = new OtpService();
module.exports = otpService;
module.exports.PURPOSE = PURPOSE;
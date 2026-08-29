const RedisService = require("./RedisService");
const Otp = require("../utils/Otp");
const OtpRepository = require("../Repositories/OtpRepository");

// ✅ Đọc thời gian hết hạn OTP từ .env
const OTP_EXPIRE_SECONDS = parseInt(process.env.OTP_EXPIRE_SECONDS) || 300;

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
    // CREATE OTP - Trả về TTL thực tế
    // ============================================================
    async createOTP(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔐 [CREATE OTP] email: "${email}", purpose: "${purpose}"`);

        const rateLimit = await RedisService.checkRateLimit(email, purpose, 3, 60);
        if (!rateLimit.allowed) {
            throw { statusCode: 429, message: rateLimit.message };
        }

        const otpCode = Otp.generate6(); 
        console.log(`📤 Generated OTP: ${otpCode}`);

        await RedisService.deleteOTP(email, purpose);
        await RedisService.saveOTP(email, purpose, otpCode, OTP_EXPIRE_SECONDS);
        
        const otpId = await OtpRepository.create({
            email,
            purpose,
            status: "sent",
            ip_address: null,
            user_agent: null
        });

        // ✅ Lấy TTL thực tế từ Redis
        const otpKey = `otp:${email}:${purpose}`;
        const ttl = await RedisService.getTTL(otpKey);

        return { 
            success: true, 
            otp: otpCode, 
            otpId,
            expiresIn: ttl > 0 ? ttl : OTP_EXPIRE_SECONDS
        };
    }

    // ============================================================
    // VERIFY OTP - XÓA OTP KHI SAI 5 LẦN
    // ============================================================
    async verifyOTP(email, otp, purpose, deleteAfterVerify = true) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔑 [VERIFY OTP] email: "${email}", purpose: "${purpose}", received otp: "${otp}"`);

        const isLocked = await RedisService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            // ✅ XÓA OTP KHỎI REDIS KHI BỊ KHÓA
            await RedisService.deleteOTP(email, purpose);
            return { success: false, code: "OTP_LOCKED", message: "OTP đã bị khóa do nhập sai quá nhiều lần" };
        }

        const savedOTP = String(await RedisService.getOTP(email, purpose) || '').trim();
        const userOTP = String(otp || '').trim();

        if (!savedOTP) {
            return { success: false, code: "OTP_NOT_FOUND", message: "OTP không tồn tại hoặc đã hết hạn" };
        }

        if (savedOTP !== userOTP) {
            const attempts = await RedisService.incrementOTPAttempts(email, purpose, 300);
            const latestLog = await OtpRepository.findLatest(email, purpose);
            if (latestLog?.otp_id) await OtpRepository.markFailed(latestLog.otp_id);
            
            // ✅ KIỂM TRA NẾU ĐẠT 5 LẦN SAI → XÓA OTP
            if (attempts >= 5) {
                await RedisService.deleteOTP(email, purpose);
                return {
                    success: false,
                    code: "OTP_LOCKED",
                    message: "Bạn đã nhập sai quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới."
                };
            }
            
            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        // ✅ CHỈ XÓA OTP KHI deleteAfterVerify = true
        if (deleteAfterVerify) {
            await RedisService.deleteOTP(email, purpose);
            const latestLog = await OtpRepository.findLatest(email, purpose);
            if (latestLog?.otp_id) await OtpRepository.markVerified(latestLog.otp_id);
            await OtpRepository.create({ email, purpose, status: "verified", ip_address: null, user_agent: null });
        } else {
            // ✅ KHÔNG XÓA OTP, chỉ reset số lần thử sai
            await RedisService.resetOTPAttempts(email, purpose);
        }

        return { success: true, message: "Xác thực OTP thành công" };
    }

    // ============================================================
    // DELETE OTP
    // ============================================================
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

    // ============================================================
    // GET OTP TTL - Kiểm tra thời gian còn lại của OTP
    // ============================================================
    async getOtpTTL(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        
        const otpKey = `otp:${email}:${purpose}`;
        const ttl = await RedisService.getTTL(otpKey);
        const otp = await RedisService.getOTP(email, purpose);

        return {
            exists: !!otp,
            expiresIn: ttl > 0 ? ttl : 0,
            purpose: purpose
        };
    }

    // ============================================================
    // RESEND OTP - KHÔNG HỖ TRỢ (dùng createOTP mới)
    // ============================================================
    async resendOTP() {
        throw new Error("Không hỗ trợ gửi lại OTP. Vui lòng bắt đầu lại giao dịch.");
    }

    // ============================================================
    // CLEANUP OLD LOGS
    // ============================================================
    async cleanupOldLogs(days = 90) {
        const deleted = await OtpRepository.cleanupOldLogs(days);
        return { success: true, deleted };
    }
}

const otpService = new OtpService();
module.exports = otpService;
module.exports.PURPOSE = PURPOSE;
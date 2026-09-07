const CacheService = require("./CacheService");
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
    // CREATE OTP - TẠO OTP MỚI + LOG
    // ============================================================
    async createOTP(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔐 [CREATE OTP] email: "${email}", purpose: "${purpose}"`);

        // Kiểm tra rate limit
        const rateLimit = await CacheService.checkRateLimit(email, purpose, 3, 300);
        if (!rateLimit.allowed) {
            throw { statusCode: 429, message: rateLimit.message };
        }

        const otpCode = Otp.generate6(); 
        console.log(`📤 Generated OTP: ${otpCode}`);

        // 🔥 Đánh dấu OTP cũ là used (is_used = 1)
        await CacheService.markOTPAsUsed(email, purpose);
        
        // ✅ Lưu OTP mới vào otp_codes (INSERT)
        const otpId = await CacheService.saveOTP(email, purpose, otpCode, OTP_EXPIRE_SECONDS);
        
        // ✅ Log vào otp_logs với mã OTP
        await OtpRepository.create({
            email,
            purpose,
            otp: otpCode,  // 👈 Lưu mã OTP
            status: "sent",
            ip_address: null,
            user_agent: null
        });

        // Lấy TTL thực tế
        const otpKey = `otp:${email}:${purpose}`;
        const ttl = await CacheService.getTTL(otpKey);

        return { 
            success: true, 
            otp: otpCode, 
            otpId,
            expiresIn: ttl > 0 ? ttl : OTP_EXPIRE_SECONDS
        };
    }

    // ============================================================
    // VERIFY OTP - XÁC THỰC OTP + LOG
    // ============================================================
    async verifyOTP(email, otp, purpose, deleteAfterVerify = true) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        console.log(`🔑 [VERIFY OTP] email: "${email}", purpose: "${purpose}", received otp: "${otp}"`);

        // Kiểm tra OTP có bị khóa do nhập sai quá 5 lần không
        const isLocked = await CacheService.isOTPLocked(email, purpose, 5);
        if (isLocked) {
            // 🔥 Đánh dấu OTP đã sử dụng
            await CacheService.markOTPAsUsed(email, purpose);
            await OtpRepository.create({
                email,
                purpose,
                otp: otp,  // 👈 Lưu OTP đã nhập
                status: "locked",
                ip_address: null,
                user_agent: null
            });
            return { 
                success: false, 
                code: "OTP_LOCKED", 
                message: "OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng gửi lại OTP mới." 
            };
        }

        // Lấy OTP mới nhất chưa dùng
        const savedOTP = String(await CacheService.getOTP(email, purpose) || '').trim();
        const userOTP = String(otp || '').trim();

        // Không tìm thấy OTP
        if (!savedOTP) {
            await OtpRepository.create({
                email,
                purpose,
                otp: userOTP,  // 👈 Lưu OTP đã nhập
                status: "expired",
                ip_address: null,
                user_agent: null
            });
            return { 
                success: false, 
                code: "OTP_NOT_FOUND", 
                message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại OTP mới." 
            };
        }

        // OTP SAI
        if (savedOTP !== userOTP) {
            // Tăng số lần thử sai
            const attempts = await CacheService.incrementOTPAttempts(email, purpose);
            
            // Log OTP sai
            await OtpRepository.create({
                email,
                purpose,
                otp: userOTP,  // 👈 Lưu OTP đã nhập (sai)
                status: "failed",
                ip_address: null,
                user_agent: null
            });
            
            // Nếu đạt 5 lần sai → khóa OTP
            if (attempts >= 5) {
                await CacheService.markOTPAsUsed(email, purpose);
                await OtpRepository.create({
                    email,
                    purpose,
                    otp: userOTP,
                    status: "locked",
                    ip_address: null,
                    user_agent: null
                });
                return {
                    success: false,
                    code: "OTP_LOCKED",
                    message: "Bạn đã nhập sai quá 5 lần. OTP đã bị vô hiệu hóa. Vui lòng gửi lại OTP mới."
                };
            }
            
            return {
                success: false,
                code: "OTP_INVALID",
                message: `OTP không đúng. Còn ${5 - attempts} lần thử`
            };
        }

        // ✅ OTP ĐÚNG
        if (deleteAfterVerify) {
            // 🔥 Đánh dấu OTP đã sử dụng (is_used = 1)
            await CacheService.markOTPAsUsed(email, purpose);
            
            // Log OTP đúng
            await OtpRepository.create({ 
                email, 
                purpose,
                otp: savedOTP,  // 👈 Lưu OTP đúng
                status: "verified", 
                ip_address: null, 
                user_agent: null 
            });
        } else {
            // Reset attempts nhưng không đánh dấu đã dùng
            await CacheService.resetOTPAttempts(email, purpose);
            
            // Log xác thực thành công (nhưng chưa dùng)
            await OtpRepository.create({ 
                email, 
                purpose,
                otp: savedOTP,  // 👈 Lưu OTP
                status: "verified_pending", 
                ip_address: null, 
                user_agent: null 
            });
        }

        return { success: true, message: "Xác thực OTP thành công" };
    }

    // ============================================================
    // INVALIDATE OTP - VÔ HIỆU HÓA OTP (is_used = 1)
    // ============================================================
    async invalidateOTP(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        
        // 🔥 Đánh dấu OTP đã sử dụng (is_used = 1)
        await CacheService.markOTPAsUsed(email, purpose);
        
        // Log invalidated
        await OtpRepository.create({ 
            email, 
            purpose,
            otp: null,
            status: "invalidated", 
            ip_address: null, 
            user_agent: null 
        });
        
        return { success: true, message: "OTP đã được vô hiệu hóa" };
    }

    // ============================================================
    // GET OTP TTL - Kiểm tra thời gian còn lại của OTP
    // ============================================================
    async getOtpTTL(email, purpose) {
        if (!purpose) throw new Error("Purpose is required");
        email = email.trim();
        
        const otpKey = `otp:${email}:${purpose}`;
        const ttl = await CacheService.getTTL(otpKey);
        const otp = await CacheService.getOTP(email, purpose);

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
// Middlewares/VerifyCapcha.js

const RecaptchaService = require("../Services/RecapchaService");

/**
 * Middleware verify CAPTCHA
 * Client gửi kèm: { recaptchaToken: "..." }
 */
const VerifyCapcha = async (req, res, next) => {
    try {
        const token = req.body.recaptchaToken;

        if (!token) {
            return res.status(400).json({
                success: false,
                field: 'recaptcha',
                message: 'Vui lòng xác thực CAPTCHA',
            });
        }

        const remoteIp = req.ip || req.connection?.remoteAddress;
        const result = await RecaptchaService.verifyRecaptcha(token, remoteIp);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                field: 'recaptcha',
                message: result.error || 'CAPTCHA không hợp lệ',
            });
        }

        // ✅ Xóa token khỏi body (không cần lưu vào DB)
        delete req.body.recaptchaToken;

        next();
    } catch (error) {
        console.error('❌ [verifyCaptcha] Error:', error);
        return res.status(500).json({
            success: false,
            field: 'recaptcha',
            message: 'Lỗi xác thực CAPTCHA',
        });
    }
};

module.exports = VerifyCapcha;
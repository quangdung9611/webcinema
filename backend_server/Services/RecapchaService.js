// Services/RecaptchaService.js

const axios = require('axios');

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify reCAPTCHA token từ client
 * @param {string} token - Token từ client (g-recaptcha-response)
 * @param {string} remoteIp - IP của client (optional)
 * @returns {Promise<{success: boolean, error?: string, errorCodes?: string[]}>}
 */
const verifyRecaptcha = async (token, remoteIp = null) => {
    if (!token) {
        return { success: false, error: 'Thiếu CAPTCHA token' };
    }

    if (!RECAPTCHA_SECRET) {
        console.error('❌ [RECAPTCHA] Chưa cấu hình RECAPTCHA_SECRET_KEY trong .env');
        return { success: false, error: 'Server chưa cấu hình CAPTCHA' };
    }

    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET);
        params.append('response', token);
        if (remoteIp) params.append('remoteip', remoteIp);

        const { data } = await axios.post(RECAPTCHA_VERIFY_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 5000,
        });

        console.log('🔍 [RECAPTCHA] Verify result:', {
            success: data.success,
            errors: data['error-codes'],
        });

        if (!data.success) {
            // Map error codes sang message tiếng Việt
            const errorCodes = data['error-codes'] || [];
            let message = 'CAPTCHA không hợp lệ hoặc đã hết hạn';

            if (errorCodes.includes('timeout-or-duplicate')) {
                message = 'CAPTCHA đã hết hạn. Vui lòng tick lại.';
            } else if (errorCodes.includes('invalid-input-secret')) {
                message = 'Lỗi cấu hình server. Vui lòng liên hệ hỗ trợ.';
                console.error('🚨 [RECAPTCHA] SECRET KEY SAI! Check lại .env');
            } else if (errorCodes.includes('missing-input-response')) {
                message = 'Vui lòng tick vào ô "Tôi không phải là robot"';
            }

            return { success: false, error: message, errorCodes };
        }

        return { success: true };
    } catch (error) {
        console.error('❌ [RECAPTCHA] Verify error:', error.message);

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return { success: false, error: 'Không thể kết nối tới Google. Vui lòng thử lại.' };
        }

        return { success: false, error: 'Không thể xác thực CAPTCHA' };
    }
};

module.exports = { verifyRecaptcha };
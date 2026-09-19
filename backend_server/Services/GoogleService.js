// Services/GoogleService.js

const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");   // ← CẦN import axios (nếu chưa có)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

/**
 * Verify Google token - hỗ trợ cả ID token và Access token
 */
const verifyGoogleToken = async (token, isAccessToken = false) => {
    if (!token) {
        throw { statusCode: 400, message: "Thiếu Google token" };
    }

    try {
        // ✅ Nếu là access_token → gọi Google API để lấy user info
        if (isAccessToken) {
            const { data } = await axios.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!data || !data.email) {
                throw { statusCode: 401, message: "Không thể lấy thông tin từ Google" };
            }

            return {
                email: data.email,
                name: data.name,
                picture: data.picture,
                sub: data.sub,
                email_verified: data.email_verified,
            };
        }

        // ✅ Nếu là ID token → verify qua library
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            throw { statusCode: 401, message: "Không thể xác thực Google token" };
        }

        if (!payload.email_verified) {
            throw { statusCode: 400, message: "Email Google chưa được xác thực" };
        }

        return {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            sub: payload.sub,
            email_verified: payload.email_verified,
        };

    } catch (error) {
        console.error("❌ [GOOGLE] Verify token error:", error.message);

        if (error.statusCode) throw error;

        throw {
            statusCode: 401,
            message: "Google token không hợp lệ hoặc đã hết hạn",
        };
    }
};

const generateUsernameFromEmail = (email) => {
    if (!email) return `user_${Date.now()}`;
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "");
    return base || `user_${Date.now()}`;
};

module.exports = {
    verifyGoogleToken,
    generateUsernameFromEmail,
};
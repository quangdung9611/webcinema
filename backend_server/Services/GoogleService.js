// Services/GoogleService.js

const { OAuth2Client } = require("google-auth-library");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!CLIENT_ID) {
    console.warn("⚠️ [GOOGLE] GOOGLE_CLIENT_ID chưa được cấu hình trong .env");
}

const client = new OAuth2Client(CLIENT_ID);

/**
 * Verify Google ID Token
 * @param {string} credential - JWT token từ Google
 * @returns {Promise<object>} - { email, name, picture, sub, email_verified }
 */
const verifyGoogleToken = async (credential) => {
    if (!credential) {
        throw {
            statusCode: 400,
            message: "Thiếu Google credential",
        };
    }

    if (!CLIENT_ID) {
        throw {
            statusCode: 500,
            message: "Google Client ID chưa được cấu hình",
        };
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            throw {
                statusCode: 401,
                message: "Không thể xác thực Google token",
            };
        }

        // ✅ Check email verified bởi Google
        if (!payload.email_verified) {
            throw {
                statusCode: 400,
                message: "Email Google chưa được xác thực",
            };
        }

        return {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            sub: payload.sub,           // Google ID (unique)
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

/**
 * Generate username từ email
 * VD: trannguyenledung9611@gmail.com → trannguyenledung9611
 */
const generateUsernameFromEmail = (email) => {
    if (!email) return `user_${Date.now()}`;
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "");
    return base || `user_${Date.now()}`;
};

module.exports = {
    verifyGoogleToken,
    generateUsernameFromEmail,
};
/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - ĐÃ SỬA: THÊM LOGGING
=========================================================*/

const authenticateUser = async (req, res, next) => {
    try {
        // Lấy user_token (cookie riêng của customer)
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            console.warn(`🔴 [AUTH] No access token found in cookies`);
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            console.warn(`🔴 [AUTH] Invalid token, clearing cookie`);
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        // Kiểm tra role customer
        if (payload.role !== "customer") {
            console.warn(`🔴 [AUTH] User ${payload.user_id} is not customer (role: ${payload.role})`);
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });
        }

        // ============================================================
        // 🔥 KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG
        // ============================================================
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        
        console.log(`🔍 [AUTH] User ${payload.user_id} - Active tokens: ${activeTokens.length}`);

        if (activeTokens.length === 0) {
            // User đã bị kick, không còn token nào active
            console.warn(`🔴 [AUTH] User ${payload.user_id} has NO active tokens - KICKED from another device!`);
            
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }

        // ============================================================
        // 🟢 THÊM: KIỂM TRA TOKEN HIỆN TẠI CÓ TRONG DANH SÁCH ACTIVE KHÔNG
        // ============================================================
        // Hash token hiện tại để so sánh
        const currentTokenHash = Jwt.hashRefreshToken(accessToken);
        const isTokenActive = activeTokens.some(token => token.token_hash === currentTokenHash);
        
        if (!isTokenActive) {
            console.warn(`🔴 [AUTH] User ${payload.user_id} - Current token is NOT in active list`);
            
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            });
        }
        // ============================================================

        req.user = payload;
        next();
    } catch (error) {
        console.error("🔴 [AUTH] Authenticate User Error:", error.message);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

module.exports = { authenticateUser };
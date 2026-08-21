/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE ADMIN - ĐÃ SỬA: THÊM LOGGING + KIỂM TRA TOKEN
=========================================================*/

const authenticateAdmin = async (req, res, next) => {
    try {
        // Lấy token từ cookie admin_token
        const accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            console.warn(`🔴 [AUTH_ADMIN] No admin token found in cookies`);
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập với tài khoản admin."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            console.warn(`🔴 [AUTH_ADMIN] Invalid admin token, clearing cookie`);
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        // Kiểm tra role admin
        if (payload.role !== "admin") {
            console.warn(`🔴 [AUTH_ADMIN] User ${payload.user_id} is not admin (role: ${payload.role})`);
            return res.status(403).json({
                success: false,
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        // ============================================================
        // 🔥 KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG
        // ============================================================
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        
        console.log(`🔍 [AUTH_ADMIN] Admin ${payload.user_id} - Active tokens: ${activeTokens.length}`);

        if (activeTokens.length === 0) {
            console.warn(`🔴 [AUTH_ADMIN] Admin ${payload.user_id} has NO active tokens - KICKED from another device!`);
            
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản admin đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }

        // ============================================================
        // 🟢 THÊM: KIỂM TRA TOKEN HIỆN TẠI CÓ TRONG DANH SÁCH ACTIVE KHÔNG
        // ============================================================
        const currentTokenHash = Jwt.hashRefreshToken(accessToken);
        const isTokenActive = activeTokens.some(token => token.token_hash === currentTokenHash);
        
        if (!isTokenActive) {
            console.warn(`🔴 [AUTH_ADMIN] Admin ${payload.user_id} - Current token is NOT in active list`);
            
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại."
            });
        }
        // ============================================================

        req.user = payload;
        next();
    } catch (error) {
        console.error("🔴 [AUTH_ADMIN] Authenticate Admin Error:", error.message);
        Cookie.clearAdminCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

module.exports = { authenticateAdmin };
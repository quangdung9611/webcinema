/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - ĐÃ SỬA LẦN 2
=========================================================*/

const authenticateUser = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });
        }

        // ============================================================
        // 🔥 SỬA QUAN TRỌNG: Bỏ qua check DB nếu là route /auth/me HOẶC là từ Socket
        // ============================================================
        // 1. Nếu là request kiểm tra user (UserHome), bỏ qua check DB
        // 2. Nếu request có thuộc tính socket (tức là từ Socket.io), cũng bỏ qua check DB để tránh vòng lặp session expired
        const isSocketRequest = req.socket && req.socket.remoteAddress;
        const isAuthMeRoute = req.path.includes('/auth/me') || req.originalUrl.includes('/auth/me');

        if (!isSocketRequest && !isAuthMeRoute) {
            const tokenHash = Jwt.hashRefreshToken(accessToken);
            const validToken = await RefreshTokenRepository.findValidTokenHash(tokenHash);
            
            if (!validToken) {
                Cookie.clearUserCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "SESSION_EXPIRED",
                    message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
                });
            }
        }
        // ============================================================
        // KẾT THÚC SỬA
        // ============================================================

        req.user = payload;
        next();
    } catch (error) {
        console.error("Authenticate User Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

module.exports = { authenticateUser };
// Middlewares/AdminAuthMiddleware.js

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

let socketIOInstance = null;
const setSocketIO = (io) => { socketIOInstance = io; console.log('✅ [ADMIN AUTH MW] Socket.IO set'); };
const getSocketIO = () => socketIOInstance;

const authenticateAdmin = async (req, res, next) => {
    try {
        const accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập với tài khoản admin."
            });
        }

        let payload;
        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.warn('🔴 [ADMIN AUTH MW] Token đã hết hạn');
                Cookie.clearAdminCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập admin đã hết hạn."
                });
            }

            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        if (!payload) {
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN",
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [ADMIN AUTH MW] Token không tồn tại trong DB');

            // ✅ BỎ EMIT — frontend tự handle 401

            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản admin đã đăng nhập trên thiết bị khác."
            });
        }

        req.user = {
            user_id: payload.user_id,
            email: payload.email,
            role: payload.role,
            username: payload.username,
            full_name: payload.full_name
        };

        next();

    } catch (error) {
        console.error("❌ [ADMIN AUTH MW] Error:", error);
        Cookie.clearAdminCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

module.exports = { authenticateAdmin, setSocketIO, getSocketIO };
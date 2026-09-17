// Middlewares/UserAuthMiddleware.js

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

let socketIOInstance = null;
const setSocketIO = (io) => { socketIOInstance = io; console.log('✅ [USER AUTH MW] Socket.IO set'); };
const getSocketIO = () => socketIOInstance;

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

        let payload;
        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.warn('🔴 [USER AUTH MW] Token đã hết hạn');
                Cookie.clearUserCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                });
            }

            console.warn('🔴 [USER AUTH MW] Token không hợp lệ:', error.message);
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

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
                code: "FORBIDDEN",
                message: "Không có quyền truy cập."
            });
        }

        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [USER AUTH MW] Token không tồn tại trong DB');

            // ✅ BỎ EMIT — frontend tự handle 401

            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
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
        console.error("❌ [USER AUTH MW] Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập không hợp lệ."
        });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);
        if (!accessToken) return next();

        let payload;
        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            return next();
        }

        if (!payload || payload.role !== "customer") return next();

        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (validToken) {
            req.user = {
                user_id: payload.user_id,
                email: payload.email,
                role: payload.role,
                username: payload.username,
                full_name: payload.full_name
            };
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = { authenticateUser, optionalAuth, setSocketIO, getSocketIO };
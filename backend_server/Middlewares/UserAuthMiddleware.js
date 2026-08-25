// middleware/authMiddleware.js

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

// Lưu socketService instance
let socketIOInstance = null;

const setSocketIO = (io) => {
    socketIOInstance = io;
};

const getSocketIO = () => socketIOInstance;

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - HOÀN CHỈNH
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

        // ============================================================
        // 🔥 VERIFY TOKEN - PHÂN BIỆT LỖI
        // ============================================================
        let payload;
        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            // ========== TOKEN_EXPIRED - Token hết hạn ==========
            if (error.name === 'TokenExpiredError') {
                console.warn('🔴 [AUTH] Token đã hết hạn');
                
                // 🔥 Lấy userId từ token cũ
                try {
                    const decoded = Jwt.decodeAccessToken(accessToken);
                    if (decoded?.user_id && socketIOInstance) {
                        Cookie.emitSessionExpired(socketIOInstance, decoded.user_id, {
                            deviceName: 'Token expired',
                            reason: 'Token đã hết hạn',
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (decodeError) {
                    console.warn('⚠️ [AUTH] Cannot decode expired token');
                }
                
                Cookie.clearUserCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                });
            }
            
            // ========== TOKEN_INVALID - Token không hợp lệ ==========
            console.warn('🔴 [AUTH] Token không hợp lệ:', error.message);
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

        // ============================================================
        // 🔥 CHECK DB: KIỂM TRA TOKEN CÓ CÒN HỢP LỆ KHÔNG
        // ============================================================
        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [AUTH] Token không tồn tại trong DB hoặc đã bị revoke');
            
            // 🔥 Gửi socket notification ngay lập tức
            if (payload?.user_id && socketIOInstance) {
                Cookie.emitSessionExpired(socketIOInstance, payload.user_id, {
                    deviceName: 'Session revoked',
                    reason: 'Token không tồn tại trong DB',
                    timestamp: new Date().toISOString()
                });
            }
            
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
        console.error("Authenticate User Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập không hợp lệ."
        });
    }
};

/*=========================================================
    OPTIONAL AUTH - KHÔNG BẮT BUỘC ĐĂNG NHẬP
=========================================================*/

const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);
        
        if (accessToken) {
            try {
                let payload;
                try {
                    payload = Jwt.verifyAccessToken(accessToken);
                } catch (error) {
                    if (error.name === 'TokenExpiredError') {
                        console.log('🟡 [AUTH] Token đã hết hạn trong optional auth');
                        return next();
                    }
                    throw error;
                }
                
                if (payload && payload.role === "customer") {
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
                }
            } catch (error) {
                console.log('🟡 [AUTH] Token không hợp lệ trong optional auth');
            }
        }
        next();
    } catch (error) {
        next();
    }
};

/*=========================================================
    EXPORT
=========================================================*/

module.exports = {
    authenticateUser,
    optionalAuth,
    setSocketIO,
    getSocketIO
};
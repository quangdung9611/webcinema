// Middlewares/UserAuthMiddleware.js

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

// ============================================================
// SOCKET.IO INSTANCE
// ============================================================
// Middleware cần io instance để emit session_expired
// → setSocketIO() được gọi từ server.js khi khởi động
// ============================================================

let socketIOInstance = null;

const setSocketIO = (io) => {
    socketIOInstance = io;
    console.log('✅ [USER AUTH MW] Socket.IO instance set');
};

const getSocketIO = () => socketIOInstance;

// ============================================================
// AUTHENTICATE USER
// ============================================================
//
// Flow:
//   1. Get token từ cookie `user_token`
//   2. Verify JWT
//      - TokenExpiredError → emit socket + 401 TOKEN_EXPIRED
//      - Lỗi khác         → clear cookie + 401 TOKEN_INVALID
//   3. Check role === 'customer'
//   4. Check token tồn tại trong DB (chưa bị revoke)
//      - Không có → emit socket + 401 SESSION_EXPIRED
//   5. Set req.user, next()
//
// ============================================================

const authenticateUser = async (req, res, next) => {
    try {
        // ----------------------------------------------------
        // 1. GET TOKEN
        // ----------------------------------------------------
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập."
            });
        }

        // ----------------------------------------------------
        // 2. VERIFY JWT
        // ----------------------------------------------------
        let payload;

        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            // ------------------------------------------------
            // 2a. TOKEN EXPIRED
            // ------------------------------------------------
            if (error.name === 'TokenExpiredError') {
                console.warn('🔴 [USER AUTH MW] Token đã hết hạn');

                // Emit socket để frontend nhận realtime
                try {
                    const decoded = Jwt.decodeAccessToken(accessToken);

                    if (decoded?.user_id && socketIOInstance) {
                        await Cookie.emitSessionExpired(
                            socketIOInstance,
                            decoded.user_id,
                            {
                                code: 'TOKEN_EXPIRED',
                                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                                deviceName: 'Token expired',
                                reason: 'Token đã hết hạn',
                                source: 'middleware',
                                timestamp: new Date().toISOString()
                            }
                        );
                    }
                } catch (decodeError) {
                    console.warn('⚠️ [USER AUTH MW] Cannot decode expired token:', decodeError.message);
                }

                Cookie.clearUserCookies(res);

                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                });
            }

            // ------------------------------------------------
            // 2b. TOKEN INVALID (lỗi khác)
            // ------------------------------------------------
            console.warn('🔴 [USER AUTH MW] Token không hợp lệ:', error.message);

            Cookie.clearUserCookies(res);

            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        // ----------------------------------------------------
        // 2c. PAYLOAD NULL
        // ----------------------------------------------------
        if (!payload) {
            Cookie.clearUserCookies(res);

            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        // ----------------------------------------------------
        // 3. CHECK ROLE
        // ----------------------------------------------------
        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN",
                message: "Không có quyền truy cập."
            });
        }

        // ----------------------------------------------------
        // 4. CHECK DB TOKEN (CHƯA BỊ REVOKE)
        // ----------------------------------------------------
        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [USER AUTH MW] Token không tồn tại trong DB hoặc đã bị revoke');

            // Emit socket để frontend nhận realtime
            if (payload?.user_id && socketIOInstance) {
                await Cookie.emitSessionExpired(
                    socketIOInstance,
                    payload.user_id,
                    {
                        code: 'SESSION_EXPIRED',
                        message: 'Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.',
                        deviceName: 'Session revoked',
                        reason: 'Token không tồn tại trong DB',
                        source: 'middleware',
                        timestamp: new Date().toISOString()
                    }
                );
            }

            Cookie.clearUserCookies(res);

            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }

        // ----------------------------------------------------
        // 5. SET REQ.USER
        // ----------------------------------------------------
        req.user = {
            user_id: payload.user_id,
            email: payload.email,
            role: payload.role,
            username: payload.username,
            full_name: payload.full_name
        };

        next();

    } catch (error) {
        console.error("❌ [USER AUTH MW] Authenticate User Error:", error);

        Cookie.clearUserCookies(res);

        return res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập không hợp lệ."
        });
    }
};

// ============================================================
// OPTIONAL AUTH
// ============================================================
// Không bắt buộc đăng nhập, nhưng nếu có token hợp lệ
// thì gán req.user để dùng cho các route public
// ============================================================

const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return next();
        }

        let payload;

        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            // Token expired hoặc invalid → bỏ qua, không chặn request
            if (error.name === 'TokenExpiredError') {
                console.log('🟡 [USER AUTH MW] Token expired trong optional auth → bỏ qua');
            } else {
                console.log('🟡 [USER AUTH MW] Token invalid trong optional auth → bỏ qua');
            }
            return next();
        }

        if (!payload || payload.role !== "customer") {
            return next();
        }

        // Check DB token
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
        // Optional auth KHÔNG bao giờ chặn request
        console.warn('🟡 [USER AUTH MW] Optional auth error:', error.message);
        next();
    }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    authenticateUser,
    optionalAuth,
    setSocketIO,
    getSocketIO
};
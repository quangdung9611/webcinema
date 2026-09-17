// Middlewares/AdminAuthMiddleware.js

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

// ============================================================
// SOCKET.IO INSTANCE
// ============================================================
let socketIOInstance = null;

const setSocketIO = (io) => {
    socketIOInstance = io;
    console.log('✅ [ADMIN AUTH MW] Socket.IO instance set');
};

const getSocketIO = () => socketIOInstance;

// ============================================================
// AUTHENTICATE ADMIN
// ============================================================
//
// Flow (GIỐNG HỆT UserAuthMiddleware):
//   1. Get token từ cookie `admin_token`
//   2. Verify JWT
//      - TokenExpiredError → emit socket + 401 TOKEN_EXPIRED
//      - Lỗi khác         → clear cookie + 401 TOKEN_INVALID
//   3. Check role === 'admin'
//   4. Check token tồn tại trong DB (chưa bị revoke)
//      - Không có → emit socket + 401 SESSION_EXPIRED
//   5. Set req.user, next()
//
// ⚠️ LƯU Ý:
//   Middleware này chỉ là FALLBACK để emit session_expired
//   khi token hết hạn tự nhiên hoặc bị revoke mà KHÔNG qua login.
//
//   Trường hợp chính (login thiết bị khác) đã được xử lý
//   trong AuthService.login() với socket_id chính xác từ token record.
//
// ============================================================

const authenticateAdmin = async (req, res, next) => {
    try {
        // ----------------------------------------------------
        // 1. GET TOKEN
        // ----------------------------------------------------
        const accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập với tài khoản admin."
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
                console.warn('🔴 [ADMIN AUTH MW] Token đã hết hạn');

                try {
                    const decoded = Jwt.decodeAccessToken(accessToken);

                    if (decoded?.user_id && socketIOInstance) {
                        await Cookie.emitSessionExpired(
                            socketIOInstance,
                            decoded.user_id,
                            {
                                code: 'TOKEN_EXPIRED',
                                message: 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.',
                                deviceName: 'Token expired',
                                reason: 'Token admin đã hết hạn',
                                source: 'admin_middleware',
                                timestamp: new Date().toISOString()
                            }
                        );
                    }
                } catch (decodeError) {
                    console.warn('⚠️ [ADMIN AUTH MW] Cannot emit session_expired:', decodeError.message);
                }

                Cookie.clearAdminCookies(res);

                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại."
                });
            }

            // ------------------------------------------------
            // 2b. TOKEN INVALID
            // ------------------------------------------------
            console.warn('🔴 [ADMIN AUTH MW] Token không hợp lệ:', error.message);

            Cookie.clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        // ----------------------------------------------------
        // 2c. PAYLOAD NULL
        // ----------------------------------------------------
        if (!payload) {
            Cookie.clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        // ----------------------------------------------------
        // 3. CHECK ROLE
        // ----------------------------------------------------
        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN",
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        // ----------------------------------------------------
        // 4. CHECK DB TOKEN (CHƯA BỊ REVOKE)
        // ----------------------------------------------------
        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [ADMIN AUTH MW] Token không tồn tại trong DB hoặc đã bị revoke');

            // ✅ Fallback: emit session_expired qua Cookie
            // Trường hợp chính đã được xử lý ở AuthService.login()
            if (payload?.user_id && socketIOInstance) {
                try {
                    await Cookie.emitSessionExpired(
                        socketIOInstance,
                        payload.user_id,
                        {
                            code: 'SESSION_EXPIRED',
                            message: 'Tài khoản admin đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.',
                            deviceName: 'Session revoked',
                            reason: 'Token admin không tồn tại trong DB',
                            source: 'admin_middleware',
                            timestamp: new Date().toISOString()
                        }
                    );
                } catch (emitError) {
                    console.warn('⚠️ [ADMIN AUTH MW] Cannot emit session_expired:', emitError.message);
                }
            }

            Cookie.clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản admin đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
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
        console.error("❌ [ADMIN AUTH MW] Authenticate Admin Error:", error);

        Cookie.clearAdminCookies(res);

        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    authenticateAdmin,
    setSocketIO,
    getSocketIO
};
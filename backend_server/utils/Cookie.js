// utils/Cookie.js

/*=========================================================
    COOKIE NAMES
=========================================================*/

const USER_ACCESS_COOKIE_NAME =
    process.env.USER_ACCESS_COOKIE_NAME || "user_token";

const ADMIN_ACCESS_COOKIE_NAME =
    process.env.ADMIN_ACCESS_COOKIE_NAME || "admin_token";

/*=========================================================
    COOKIE DOMAIN (PRODUCTION)
=========================================================*/

const COOKIE_DOMAIN = ".quangdungcinema.id.vn";

/*=========================================================
    CACHE SERVICE (LAZY LOAD — TRÁNH CIRCULAR DEPENDENCY)
=========================================================*/
// Cookie.js cần CacheService để lấy socket_id của user
// nhưng CacheService có thể import Cookie → circular
// → Dùng lazy require trong method

let _cacheService = null;

const getCacheService = () => {
    if (!_cacheService) {
        try {
            _cacheService = require("../Services/CacheService");
        } catch (error) {
            console.warn("⚠️ [COOKIE] Cannot load CacheService:", error.message);
            return null;
        }
    }
    return _cacheService;
};

/*=========================================================
    COOKIE CLASS
=========================================================*/

class Cookie {

    /*=====================================================
        PRIVATE
    =====================================================*/

    getCookieOptions(maxAge = 24 * 60 * 60 * 1000) {
        const isProduction = process.env.NODE_ENV === "production";

        const options = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            path: "/",
            maxAge
        };

        if (isProduction) {
            options.domain = COOKIE_DOMAIN;
        }

        return options;
    }

    getClearCookieOptions() {
        const isProduction = process.env.NODE_ENV === "production";

        const clearOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            path: "/"
        };

        if (isProduction) {
            clearOptions.domain = COOKIE_DOMAIN;
        }

        return clearOptions;
    }

    /*=====================================================
        USER TOKEN
    =====================================================*/

    setUserAccessToken(res, token, rememberMe = false) {
        const maxAge = rememberMe
            ? 7 * 24 * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

        res.cookie(
            USER_ACCESS_COOKIE_NAME,
            token,
            this.getCookieOptions(maxAge)
        );
    }

    getUserAccessToken(req) {
        return req.cookies?.[USER_ACCESS_COOKIE_NAME] || null;
    }

    clearUserCookies(res) {
        res.clearCookie(
            USER_ACCESS_COOKIE_NAME,
            this.getClearCookieOptions()
        );
    }

    /*=====================================================
        ADMIN TOKEN
    =====================================================*/

    setAdminAccessToken(res, token, rememberMe = false) {
        const maxAge = rememberMe
            ? 7 * 24 * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

        res.cookie(
            ADMIN_ACCESS_COOKIE_NAME,
            token,
            this.getCookieOptions(maxAge)
        );
    }

    getAdminAccessToken(req) {
        return req.cookies?.[ADMIN_ACCESS_COOKIE_NAME] || null;
    }

    clearAdminCookies(res) {
        res.clearCookie(
            ADMIN_ACCESS_COOKIE_NAME,
            this.getClearCookieOptions()
        );
    }

    /*=====================================================
        CLEAR ALL
    =====================================================*/

    clearAllCookies(res) {
        this.clearUserCookies(res);
        this.clearAdminCookies(res);
    }

    /*=====================================================
        ✅ EMIT SESSION EXPIRED (QUA SOCKET)
    =====================================================*/
    /**
     * Emit event `session_expired` tới socket_id của user
     *
     * @param {SocketIO.Server} io - Socket.IO instance
     * @param {Number|String} userId - ID của user
     * @param {Object} detail - Thông tin chi tiết
     * @returns {Promise<Boolean>} - true nếu emit thành công
     *
     * Signature khớp với UserAuthMiddleware.js:
     *   Cookie.emitSessionExpired(socketIOInstance, decoded.user_id, {
     *     deviceName: 'Token expired',
     *     reason: 'Token đã hết hạn',
     *     timestamp: new Date().toISOString()
     *   })
     */
    async emitSessionExpired(io, userId, detail = {}) {
        try {
            // -----------------------------------------------
            // Validate
            // -----------------------------------------------
            if (!io) {
                console.warn('⚠️ [COOKIE] emitSessionExpired: io không tồn tại');
                return false;
            }

            if (!userId) {
                console.warn('⚠️ [COOKIE] emitSessionExpired: userId không tồn tại');
                return false;
            }

            // -----------------------------------------------
            // Lấy socket_id từ Cache
            // -----------------------------------------------
            const cache = getCacheService();
            if (!cache) {
                console.warn('⚠️ [COOKIE] CacheService không khả dụng');
                return false;
            }

            const socketId = await cache.getUserSocket(userId);

            if (!socketId) {
                console.log(`ℹ️ [COOKIE] User ${userId} không có socket đang kết nối`);
                return false;
            }

            // -----------------------------------------------
            // Build payload
            // -----------------------------------------------
            const payload = {
                code: detail.code || 'TOKEN_EXPIRED',
                message: detail.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                newDevice: detail.newDevice || null,
                reason: detail.reason || null,
                deviceName: detail.deviceName || null,
                source: detail.source || 'middleware',
                fromSocket: true,
                timestamp: detail.timestamp || new Date().toISOString()
            };

            // -----------------------------------------------
            // Emit tới socket_id
            // -----------------------------------------------
            io.to(socketId).emit('session_expired', payload);

            console.log(`📤 [COOKIE] session_expired emitted to socket ${socketId} (user ${userId})`);

            // -----------------------------------------------
            // Xóa socket_id khỏi Cache sau khi emit
            // -----------------------------------------------
            try {
                await cache.deleteUserSocket(userId);
                console.log(`🗑️ [COOKIE] Đã xóa socket_id của user ${userId} khỏi Cache`);
            } catch (deleteError) {
                console.warn('⚠️ [COOKIE] Không thể xóa socket_id:', deleteError.message);
            }

            return true;

        } catch (error) {
            console.error('❌ [COOKIE] emitSessionExpired error:', error);
            return false;
        }
    }

    /*=====================================================
        ✅ EMIT SESSION EXPIRED TO SOCKET (TRỰC TIẾP)
    =====================================================*/
    /**
     * Emit trực tiếp tới socket_id (không qua userId)
     * Dùng khi đã có sẵn socket_id (ví dụ trong AuthService.login)
     *
     * @param {SocketIO.Server} io
     * @param {String} socketId
     * @param {Object} detail
     * @returns {Boolean}
     */
    emitSessionExpiredToSocket(io, socketId, detail = {}) {
        try {
            if (!io || !socketId) {
                console.warn('⚠️ [COOKIE] emitSessionExpiredToSocket: thiếu io hoặc socketId');
                return false;
            }

            const payload = {
                code: detail.code || 'SESSION_REPLACED',
                message: detail.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                newDevice: detail.newDevice || null,
                reason: detail.reason || null,
                deviceName: detail.deviceName || null,
                source: detail.source || 'login',
                fromSocket: true,
                timestamp: detail.timestamp || new Date().toISOString()
            };

            io.to(socketId).emit('session_expired', payload);

            console.log(`📤 [COOKIE] session_expired emitted to socket ${socketId}`);

            return true;

        } catch (error) {
            console.error('❌ [COOKIE] emitSessionExpiredToSocket error:', error);
            return false;
        }
    }
}

module.exports = new Cookie();
// utils/Cookie.js

const USER_ACCESS_COOKIE_NAME = process.env.USER_ACCESS_COOKIE_NAME || "user_token";
const ADMIN_ACCESS_COOKIE_NAME = process.env.ADMIN_ACCESS_COOKIE_NAME || "admin_token";
const COOKIE_DOMAIN = ".quangdungcinema.id.vn";
const COOKIE_DOMAIN_NO_DOT = "quangdungcinema.id.vn";

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

class Cookie {
    getCookieOptions(maxAge = 24 * 60 * 60 * 1000) {
        const isProduction = process.env.NODE_ENV === "production";
        const options = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            path: "/",
            maxAge
        };
        if (isProduction) options.domain = COOKIE_DOMAIN;
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
        if (isProduction) clearOptions.domain = COOKIE_DOMAIN;
        return clearOptions;
    }

    // ✅ FORCE CLEAR USER COOKIES (4 variants)
    forceClearUserCookies(res) {
        const isProduction = process.env.NODE_ENV === "production";
        console.log('🧹 [COOKIE] Force clearing user_token...');

        res.clearCookie(USER_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            path: "/",
            domain: isProduction ? COOKIE_DOMAIN : undefined
        });

        if (isProduction) {
            res.clearCookie(USER_ACCESS_COOKIE_NAME, { path: "/", domain: COOKIE_DOMAIN_NO_DOT });
            res.clearCookie(USER_ACCESS_COOKIE_NAME, { path: "/", domain: COOKIE_DOMAIN });
        }

        res.clearCookie(USER_ACCESS_COOKIE_NAME, { path: "/" });
        console.log('✅ [COOKIE] Force cleared user_token');
    }

    // ✅ FORCE CLEAR ADMIN COOKIES (4 variants)
    forceClearAdminCookies(res) {
        const isProduction = process.env.NODE_ENV === "production";
        console.log('🧹 [COOKIE] Force clearing admin_token...');

        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            path: "/",
            domain: isProduction ? COOKIE_DOMAIN : undefined
        });

        if (isProduction) {
            res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, { path: "/", domain: COOKIE_DOMAIN_NO_DOT });
            res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, { path: "/", domain: COOKIE_DOMAIN });
        }

        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, { path: "/" });
        console.log('✅ [COOKIE] Force cleared admin_token');
    }

    setUserAccessToken(res, token, rememberMe = false) {
        const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        res.cookie(USER_ACCESS_COOKIE_NAME, token, this.getCookieOptions(maxAge));
    }

    getUserAccessToken(req) {
        return req.cookies?.[USER_ACCESS_COOKIE_NAME] || null;
    }

    clearUserCookies(res) {
        this.forceClearUserCookies(res);
    }

    setAdminAccessToken(res, token, rememberMe = false) {
        const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        res.cookie(ADMIN_ACCESS_COOKIE_NAME, token, this.getCookieOptions(maxAge));
    }

    getAdminAccessToken(req) {
        return req.cookies?.[ADMIN_ACCESS_COOKIE_NAME] || null;
    }

    clearAdminCookies(res) {
        this.forceClearAdminCookies(res);
    }

    clearAllCookies(res) {
        this.forceClearUserCookies(res);
        this.forceClearAdminCookies(res);
    }

    async emitSessionExpired(io, userId, detail = {}) {
        try {
            if (!io || !userId) return false;
            const cache = getCacheService();
            if (!cache) return false;

            const socketId = await cache.getUserSocket(userId);
            if (!socketId) return false;

            const payload = {
                code: detail.code || 'TOKEN_EXPIRED',
                message: detail.message || 'Phiên đăng nhập đã hết hạn.',
                newDevice: detail.newDevice || null,
                reason: detail.reason || null,
                deviceName: detail.deviceName || null,
                source: detail.source || 'middleware',
                fromSocket: true,
                timestamp: detail.timestamp || new Date().toISOString()
            };

            io.to(socketId).emit('session_expired', payload);
            console.log(`📤 [COOKIE] session_expired emitted to socket ${socketId}`);
            return true;
        } catch (error) {
            console.error('❌ [COOKIE] emitSessionExpired error:', error);
            return false;
        }
    }

    emitSessionExpiredToSocket(io, socketId, detail = {}) {
        try {
            if (!io || !socketId) return false;
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
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new Cookie();
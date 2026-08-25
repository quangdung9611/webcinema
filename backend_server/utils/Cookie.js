// utils/Cookie.js

/*=========================================================
    COOKIE NAMES
=========================================================*/

const USER_ACCESS_COOKIE_NAME =
    process.env.USER_ACCESS_COOKIE_NAME || "user_token";

const ADMIN_ACCESS_COOKIE_NAME =
    process.env.ADMIN_ACCESS_COOKIE_NAME || "admin_token";

/*=========================================================
    COOKIE CLASS
=========================================================*/

class Cookie {

    /*=====================================================
        PRIVATE
    =====================================================*/

    getCookieOptions(maxAge = 24 * 60 * 60 * 1000) {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/",
            maxAge
        };
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

    clearUserCookies(res, io = null, userId = null, deviceInfo = null) {
        res.clearCookie(USER_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/"
        });

        // 🔥 Gửi socket notification ngay lập tức
        if (io && userId) {
            this.emitSessionExpired(io, userId, deviceInfo);
        }
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

    clearAdminCookies(res, io = null, userId = null, deviceInfo = null) {
        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/"
        });

        // 🔥 Gửi socket notification ngay lập tức
        if (io && userId) {
            this.emitSessionExpired(io, userId, deviceInfo);
        }
    }

    /*=====================================================
        CLEAR ALL
    =====================================================*/

    clearAllCookies(res, io = null, userId = null, deviceInfo = null) {
        this.clearUserCookies(res, io, userId, deviceInfo);
        this.clearAdminCookies(res, io, userId, deviceInfo);
    }

    /*=====================================================
        🔥 EMIT SESSION EXPIRED VIA SOCKET.IO
    =====================================================*/

    emitSessionExpired(io, userId, deviceInfo = null) {
        if (!io || !userId) {
            console.warn('⚠️ [COOKIE] Cannot emit session_expired: missing io or userId');
            return;
        }

        console.log(`🔴 [COOKIE] Emitting session_expired for user: ${userId}`);

        const payload = {
            code: 'SESSION_EXPIRED',
            type: 'device',
            message: 'Tài khoản đã được đăng nhập trên thiết bị khác.',
            newDevice: deviceInfo || {
                deviceName: 'Thiết bị khác',
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        // Gửi đến room của user
        io.to(`user_${userId}`).emit('session_expired', payload);

        console.log(`✅ [COOKIE] session_expired sent to user_${userId}`);
    }

    /*=====================================================
        🔥 FORCE LOGOUT - CLEAR COOKIE + SOCKET NOTIFY
    =====================================================*/

    forceLogout(res, io, userId, deviceInfo = null) {
        console.log(`🔴 [COOKIE] Force logout for user: ${userId}`);
        
        // Clear cookies
        this.clearAllCookies(res, io, userId, deviceInfo);
        
        console.log(`✅ [COOKIE] Force logout completed for user: ${userId}`);
    }
}

module.exports = new Cookie();
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

    /**
     * ✅ FIX: XÓA HOÀN TOÀN emit session_expired
     * Chỉ clear cookie, không gửi socket notification
     */
    clearUserCookies(res) {
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

        res.clearCookie(USER_ACCESS_COOKIE_NAME, clearOptions);
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

    /**
     * ✅ FIX: XÓA HOÀN TOÀN emit session_expired
     */
    clearAdminCookies(res) {
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

        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, clearOptions);
    }

    /*=====================================================
        CLEAR ALL
    =====================================================*/

    clearAllCookies(res) {
        this.clearUserCookies(res);
        this.clearAdminCookies(res);
    }
}

module.exports = new Cookie();
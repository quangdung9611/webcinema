/*=========================================================
    DEPENDENCIES
=========================================================*/

const USER_ACCESS_COOKIE_NAME = process.env.USER_ACCESS_COOKIE_NAME || "user_access_token";
const USER_REFRESH_COOKIE_NAME = process.env.USER_REFRESH_COOKIE_NAME || "user_refresh_token";
const ADMIN_ACCESS_COOKIE_NAME = process.env.ADMIN_ACCESS_COOKIE_NAME || "admin_access_token";
const ADMIN_REFRESH_COOKIE_NAME = process.env.ADMIN_REFRESH_COOKIE_NAME || "admin_refresh_token";

/*=========================================================
    DEFAULT COOKIE OPTIONS
=========================================================*/

const DEFAULT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".quangdungcinema.id.vn" : undefined
};

/*=========================================================
    COOKIE CLASS
=========================================================*/

class Cookie {

    /*=====================================================
        USER TOKENS
    =====================================================*/

    setUserAccessToken(res, token) {
        res.cookie(USER_ACCESS_COOKIE_NAME, token, {
            ...DEFAULT_COOKIE_OPTIONS,
            maxAge: Number(process.env.USER_ACCESS_COOKIE_MAX_AGE) || 15 * 60 * 1000
        });
    }

    setUserRefreshToken(res, token) {
        res.cookie(USER_REFRESH_COOKIE_NAME, token, {
            ...DEFAULT_COOKIE_OPTIONS,
            maxAge: Number(process.env.USER_REFRESH_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000
        });
    }

    getUserAccessToken(req) {
        return req.cookies?.[USER_ACCESS_COOKIE_NAME];
    }

    getUserRefreshToken(req) {
        return req.cookies?.[USER_REFRESH_COOKIE_NAME];
    }

    clearUserCookies(res) {
        res.clearCookie(USER_ACCESS_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
        res.clearCookie(USER_REFRESH_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
    }

    /*=====================================================
        ADMIN TOKENS
    =====================================================*/

    setAdminAccessToken(res, token) {
        res.cookie(ADMIN_ACCESS_COOKIE_NAME, token, {
            ...DEFAULT_COOKIE_OPTIONS,
            maxAge: Number(process.env.ADMIN_ACCESS_COOKIE_MAX_AGE) || 15 * 60 * 1000
        });
    }

    setAdminRefreshToken(res, token) {
        res.cookie(ADMIN_REFRESH_COOKIE_NAME, token, {
            ...DEFAULT_COOKIE_OPTIONS,
            maxAge: Number(process.env.ADMIN_REFRESH_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000
        });
    }

    getAdminAccessToken(req) {
        return req.cookies?.[ADMIN_ACCESS_COOKIE_NAME];
    }

    getAdminRefreshToken(req) {
        return req.cookies?.[ADMIN_REFRESH_COOKIE_NAME];
    }

    clearAdminCookies(res) {
        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
        res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
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
/*=========================================================
    COOKIE NAMES
=========================================================*/

const USER_ACCESS_COOKIE_NAME =
    process.env.USER_ACCESS_COOKIE_NAME || "user_token";

const ADMIN_ACCESS_COOKIE_NAME =
    process.env.ADMIN_ACCESS_COOKIE_NAME || "admin_token";

const REFRESH_TOKEN_COOKIE_NAME =
    process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";

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

    clearUserCookies(res) {
        res.clearCookie(USER_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/"
        });
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
        res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/"
        });
    }

    /*=====================================================
        REFRESH TOKEN (THÊM MỚI)
    =====================================================*/

    setRefreshToken(res, token, rememberMe = false) {
        const maxAge = rememberMe
            ? 7 * 24 * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

        res.cookie(
            REFRESH_TOKEN_COOKIE_NAME,
            token,
            this.getCookieOptions(maxAge)
        );
    }

    getRefreshToken(req) {
        return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || null;
    }

    clearRefreshToken(res) {
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/"
        });
    }

    /*=====================================================
        CLEAR ALL (ĐÃ SỬA)
    =====================================================*/

    clearAllCookies(res) {
        this.clearUserCookies(res);
        this.clearAdminCookies(res);
        this.clearRefreshToken(res);
    }
}

module.exports = new Cookie();
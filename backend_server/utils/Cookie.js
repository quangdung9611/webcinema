const ACCESS_COOKIE_NAME =
    process.env.ACCESS_COOKIE_NAME || "access_token";

const REFRESH_COOKIE_NAME =
    process.env.REFRESH_COOKIE_NAME || "refresh_token";

/*=========================================================
    DEFAULT COOKIE OPTIONS
=========================================================*/

const DEFAULT_COOKIE_OPTIONS = {

    httpOnly: true,

    secure:
        process.env.NODE_ENV === "production",

    sameSite:
        process.env.NODE_ENV === "production"
            ? "None"
            : "Lax",

    path: "/"

};

class Cookie {

    /*=========================================================
        SET ACCESS TOKEN
    =========================================================*/

    setAccessToken(res, token) {

        res.cookie(
            ACCESS_COOKIE_NAME,
            token,
            {
                ...DEFAULT_COOKIE_OPTIONS,

                maxAge:
                    Number(process.env.ACCESS_COOKIE_MAX_AGE)
                    || 15 * 60 * 1000
            }
        );

    }

    /*=========================================================
        SET REFRESH TOKEN
    =========================================================*/

    setRefreshToken(res, token) {

        res.cookie(
            REFRESH_COOKIE_NAME,
            token,
            {
                ...DEFAULT_COOKIE_OPTIONS,

                maxAge:
                    Number(process.env.REFRESH_COOKIE_MAX_AGE)
                    || 7 * 24 * 60 * 60 * 1000
            }
        );

    }

    /*=========================================================
        GET ACCESS TOKEN
    =========================================================*/

    getAccessToken(req) {

        return req.cookies?.[ACCESS_COOKIE_NAME];

    }

    /*=========================================================
        GET REFRESH TOKEN
    =========================================================*/

    getRefreshToken(req) {

        return req.cookies?.[REFRESH_COOKIE_NAME];

    }

    /*=========================================================
        CLEAR ACCESS TOKEN
    =========================================================*/

    clearAccessToken(res) {

        res.clearCookie(
            ACCESS_COOKIE_NAME,
            DEFAULT_COOKIE_OPTIONS
        );

    }

    /*=========================================================
        CLEAR REFRESH TOKEN
    =========================================================*/

    clearRefreshToken(res) {

        res.clearCookie(
            REFRESH_COOKIE_NAME,
            DEFAULT_COOKIE_OPTIONS
        );

    }

    /*=========================================================
        CLEAR ALL AUTH COOKIE
    =========================================================*/

    clearAuthCookies(res) {

        this.clearAccessToken(res);

        this.clearRefreshToken(res);

    }

}

module.exports = new Cookie();
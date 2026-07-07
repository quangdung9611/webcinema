/*=========================================================
    DEPENDENCIES
=========================================================*/

/*=========================================================
    COOKIE NAMES
=========================================================*/

// Dùng chung 1 tên cookie cho cả user và admin
// Vì domain đã phân biệt: quangdungcinema.id.vn và admin.quangdungcinema.id.vn
const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "access_token";
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";

/*=========================================================
    DEFAULT COOKIE OPTIONS
=========================================================*/

const DEFAULT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
    // Tự động lấy domain gốc, cookie sẽ hoạt động trên cả subdomain
    domain: process.env.NODE_ENV === "production" ? ".quangdungcinema.id.vn" : undefined
};

/*=========================================================
    COOKIE CLASS
=========================================================*/

class Cookie {

    /*=====================================================
        SET TOKENS
    =====================================================*/

    setAccessToken(res, token) {
        res.cookie(
            ACCESS_COOKIE_NAME,
            token,
            {
                ...DEFAULT_COOKIE_OPTIONS,
                maxAge: Number(process.env.ACCESS_COOKIE_MAX_AGE) || 15 * 60 * 1000
            }
        );
    }

    setRefreshToken(res, token) {
        res.cookie(
            REFRESH_COOKIE_NAME,
            token,
            {
                ...DEFAULT_COOKIE_OPTIONS,
                maxAge: Number(process.env.REFRESH_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000
            }
        );
    }

    /*=====================================================
        GET TOKENS
    =====================================================*/

    getAccessToken(req) {
        return req.cookies?.[ACCESS_COOKIE_NAME];
    }

    getRefreshToken(req) {
        return req.cookies?.[REFRESH_COOKIE_NAME];
    }

    /*=====================================================
        CLEAR TOKENS
    =====================================================*/

    clearAccessToken(res) {
        res.clearCookie(ACCESS_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
    }

    clearRefreshToken(res) {
        res.clearCookie(REFRESH_COOKIE_NAME, DEFAULT_COOKIE_OPTIONS);
    }

    clearAuthCookies(res) {
        this.clearAccessToken(res);
        this.clearRefreshToken(res);
    }

    /*=====================================================
        COMPATIBILITY (GIỮ CÁC TÊN HÀM CŨ ĐỂ KHÔNG LỖI)
    =====================================================*/

    // Các hàm này giữ nguyên tên nhưng gọi lại hàm chính
    setUserAccessToken(res, token) {
        this.setAccessToken(res, token);
    }

    setUserRefreshToken(res, token) {
        this.setRefreshToken(res, token);
    }

    getUserAccessToken(req) {
        return this.getAccessToken(req);
    }

    getUserRefreshToken(req) {
        return this.getRefreshToken(req);
    }

    clearUserCookies(res) {
        this.clearAuthCookies(res);
    }

    setAdminAccessToken(res, token) {
        this.setAccessToken(res, token);
    }

    setAdminRefreshToken(res, token) {
        this.setRefreshToken(res, token);
    }

    getAdminAccessToken(req) {
        return this.getAccessToken(req);
    }

    getAdminRefreshToken(req) {
        return this.getRefreshToken(req);
    }

    clearAdminCookies(res) {
        this.clearAuthCookies(res);
    }

    clearAllCookies(res) {
        this.clearAuthCookies(res);
    }

    hasUserAccessToken(req) {
        return !!this.getAccessToken(req);
    }

    hasAdminAccessToken(req) {
        return !!this.getAccessToken(req);
    }
}

module.exports = new Cookie();
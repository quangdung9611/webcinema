/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");

/*=========================================================
    AUTHENTICATE - Dùng chung cho user và admin
=========================================================*/

const authenticate = (req, res, next) => {
    try {
        // Thử lấy admin token trước, nếu không có thì lấy user token
        let accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            accessToken = Cookie.getUserAccessToken(req);
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);
        if (!payload) {
            Cookie.clearAllCookies(res);
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ."
            });
        }

        req.user = payload;
        next();

    } catch (error) {
        Cookie.clearAllCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

/*=========================================================
    AUTHENTICATE ADMIN - Chỉ cho admin
=========================================================*/

const authenticateAdmin = (req, res, next) => {
    try {
        const accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập với tài khoản admin."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);
        if (!payload) {
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                message: "Token admin không hợp lệ."
            });
        }

        if (payload.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        req.user = payload;
        next();

    } catch (error) {
        Cookie.clearAdminCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

/*=========================================================
    AUTHORIZE - Phân quyền theo role
=========================================================*/

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập."
            });
        }

        next();
    };
};

/*=========================================================
    OPTIONAL AUTH - Xác thực tùy chọn (không bắt buộc)
=========================================================*/

const optionalAuth = (req, res, next) => {
    try {
        let accessToken = Cookie.getAdminAccessToken(req);
        if (!accessToken) {
            accessToken = Cookie.getUserAccessToken(req);
        }

        if (accessToken) {
            const payload = Jwt.verifyAccessToken(accessToken);
            req.user = payload;
        } else {
            req.user = null;
        }
    } catch {
        req.user = null;
    }
    next();
};

/*=========================================================
    EXPORTS
=========================================================*/

module.exports = {
    authenticate,
    authenticateAdmin,
    authorize,
    optionalAuth
};
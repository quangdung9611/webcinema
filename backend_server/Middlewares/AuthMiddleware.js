/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../Utils/Jwt");
const Cookie = require("../Utils/Cookie");

/*=========================================================
    AUTHENTICATE
=========================================================*/

const authenticate = (req, res, next) => {

    try {

        /*==============================================
            GET ACCESS TOKEN
        ==============================================*/

        const accessToken =
            Cookie.getAccessToken(req);

        if (!accessToken) {

            return res.status(401).json({

                success: false,

                message: "Vui lòng đăng nhập."

            });

        }

        /*==============================================
            VERIFY ACCESS TOKEN
        ==============================================*/

        const payload =
            Jwt.verifyAccessToken(accessToken);

        req.user = payload;

        next();

    }

    catch (error) {

        Cookie.clearAuthCookies(res);

        return res.status(401).json({

            success: false,

            message: "Phiên đăng nhập đã hết hạn."

        });

    }

};

/*=========================================================
    AUTHORIZE
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
    OPTIONAL AUTH
=========================================================*/

const optionalAuth = (req, res, next) => {

    try {

        const accessToken =
            Cookie.getAccessToken(req);

        if (!accessToken) {

            return next();

        }

        const payload =
            Jwt.verifyAccessToken(accessToken);

        req.user = payload;

    }

    catch {

        req.user = null;

    }

    next();

};

/*=========================================================
    EXPORTS
=========================================================*/

module.exports = {

    authenticate,

    authorize,

    optionalAuth

};
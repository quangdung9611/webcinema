/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER)
    - Xác thực token
    - Chỉ cho phép role = "customer"
=========================================================*/

const authenticateUser = (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ."
            });
        }

        // 👇 Check role customer
        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập. Yêu cầu quyền Customer."
            });
        }

        req.user = payload;
        next();
    } catch (error) {
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

/*=========================================================
    AUTHENTICATE ADMIN
    - Xác thực token
    - Chỉ cho phép role = "admin"
=========================================================*/

const authenticateAdmin = (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ."
            });
        }

        // 👇 Check role admin
        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập. Yêu cầu quyền Admin."
            });
        }

        req.user = payload;
        next();
    } catch (error) {
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

/*=========================================================
    EXPORT
=========================================================*/

module.exports = { authenticateUser, authenticateAdmin };
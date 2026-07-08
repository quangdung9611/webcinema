/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");

/*=========================================================
    AUTHENTICATE USER
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

        if (payload.role !== "customer") {

            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });

        }

        req.user = payload;

        next();

    }

    catch (error) {

        Cookie.clearUserCookies(res);

        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });

    }

};


module.exports = { authenticateUser };  // 👈 Thêm dấu {}
/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - ĐÃ SỬA HOÀN CHỈNH
=========================================================*/

const authenticateUser = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });
        }

        // ✅ KHÔNG CHECK DB! Chỉ cần token JWT hợp lệ là đủ
        req.user = payload;
        next();
    } catch (error) {
        console.error("Authenticate User Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

module.exports = { authenticateUser };
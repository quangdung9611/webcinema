/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");

/*=========================================================
    AUTHENTICATE ADMIN - ĐÃ SỬA HOÀN CHỈNH
=========================================================*/

const authenticateAdmin = async (req, res, next) => {
    try {
        const accessToken = Cookie.getAdminAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập với tài khoản admin."
            });
        }

        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token admin không hợp lệ."
            });
        }

        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        // ✅ KHÔNG CHECK DB! Chỉ cần token JWT hợp lệ là đủ
        req.user = payload;
        next();
    } catch (error) {
        console.error("Authenticate Admin Error:", error);
        Cookie.clearAdminCookies(res);
        return res.status(401).json({
            success: false,
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

module.exports = { authenticateAdmin };
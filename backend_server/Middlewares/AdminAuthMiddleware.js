// Middlewares/AdminAuthMiddleware.js
const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE ADMIN
=========================================================*/
const authenticateAdmin = async (req, res, next) => {
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

        // ==========================================================
        // 👉 KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG (SINGLE SESSION)
        // ==========================================================
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        if (activeTokens.length === 0) {
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                message: "Tài khoản admin đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại!",
                code: "SESSION_EXPIRED"
            });
        }

        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        req.user = payload;
        next();

    } catch (error) {
        console.error("Authenticate Admin Error:", error);
        Cookie.clearAdminCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập admin đã hết hạn."
        });
    }
};

module.exports = { authenticateAdmin };
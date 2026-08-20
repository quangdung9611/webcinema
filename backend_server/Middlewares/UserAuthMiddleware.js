/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER)
=========================================================*/

const authenticateUser = async (req, res, next) => {
    try {
        // Lấy user_token (cookie riêng của customer)
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập."
            });
        }

        // Verify token
        const payload = Jwt.verifyAccessToken(accessToken);

        if (!payload) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ."
            });
        }

        // 👉 KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG (SINGLE SESSION)
        // Kiểm tra xem user có refresh token hợp lệ không
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        if (activeTokens.length === 0) {
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                message: "Tài khoản đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại!",
                code: "SESSION_EXPIRED" // 👈 CODE QUAN TRỌNG CHO FRONTEND
            });
        }

        // Kiểm tra role customer
        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });
        }

        req.user = payload;
        next();

    } catch (error) {
        console.error("User Auth Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

module.exports = { authenticateUser };
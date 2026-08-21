/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE ADMIN - ĐÃ SỬA: THÊM KIỂM TRA TOKEN ACTIVE
=========================================================*/

const authenticateAdmin = async (req, res, next) => { // ✅ Thêm async
    try {
        // Lấy token từ cookie admin_token
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

        // Kiểm tra role admin
        if (payload.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Yêu cầu quyền quản trị viên."
            });
        }

        // ========== 🟢 THÊM MỚI: KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG ==========
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        
        if (activeTokens.length === 0) {
            Cookie.clearAdminCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản admin đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }
        // ========== KẾT THÚC ==========

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
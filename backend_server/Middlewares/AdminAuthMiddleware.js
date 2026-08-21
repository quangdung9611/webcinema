/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

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

        // ============================================================
        // 🔥 SỬA QUAN TRỌNG: Chỉ kiểm tra DB nếu KHÔNG phải route auth/me
        // ============================================================
        // Nếu là request kiểm tra user (từ UserHome), bỏ qua check DB để tránh lỗi 401 làm sập Promise.all FE
        if (!req.path.includes('/auth/me') && !req.originalUrl.includes('/auth/me')) {
            const tokenHash = Jwt.hashRefreshToken(accessToken);
            const validToken = await RefreshTokenRepository.findValidTokenHash(tokenHash);
            
            if (!validToken) {
                Cookie.clearAdminCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "SESSION_EXPIRED",
                    message: "Tài khoản admin đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
                });
            }
        }
        // ============================================================
        // KẾT THÚC SỬA
        // ============================================================

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
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
        // ✅ Lấy user_token (cookie riêng của customer)
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

        // ✅ KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG (CHỈ ĐĂNG NHẬP 1 THIẾT BỊ)
        // Lấy tất cả active token của user
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        
        // Nếu có nhiều hơn 1 active token -> đăng nhập ở thiết bị khác
        if (activeTokens.length > 1) {
            // Revoke tất cả token cũ (bao gồm token hiện tại)
            await RefreshTokenRepository.revokeByUser(
                payload.user_id,
                "Đăng nhập ở thiết bị khác - Vui lòng đăng nhập lại"
            );
            
            // Xóa cookie
            Cookie.clearUserCookies(res);
            
            return res.status(401).json({
                success: false,
                message: "Tài khoản đã được đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại.",
                code: "SESSION_EXPIRED"
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
        console.error("Authenticate User Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập đã hết hạn."
        });
    }
};

module.exports = { authenticateUser };
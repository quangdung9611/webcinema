/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - ĐÃ SỬA: THÊM KIỂM TRA TOKEN ACTIVE
=========================================================*/

const authenticateUser = async (req, res, next) => { // ✅ Thêm async
    try {
        // Lấy user_token (cookie riêng của customer)
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED", // ✅ Thêm mã lỗi cho frontend
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

        // Kiểm tra role customer
        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập."
            });
        }

        // ========== 🟢 THÊM MỚI: KIỂM TRA TOKEN CÓ BỊ REVOKE KHÔNG ==========
        // Kiểm tra xem user có token active nào không
        const activeTokens = await RefreshTokenRepository.getActiveByUser(payload.user_id);
        
        if (activeTokens.length === 0) {
            // User đã bị kick, không còn token nào active
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED", // ✅ Mã lỗi này để frontend bắt
                message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }

        // Optional: Kiểm tra token hiện tại có trong danh sách active không
        // Nếu muốn chính xác hơn, có thể kiểm tra token hash khớp với token hiện tại
        // ========== KẾT THÚC ==========

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
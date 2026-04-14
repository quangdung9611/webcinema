const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Domain cấu hình
const USER_DOMAIN = "quangdungcinema.id.vn";
const ADMIN_DOMAIN = "admin.quangdungcinema.id.vn";

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
};

const AuthMiddleware = (req, res, next) => {
    const hostname = req.hostname;
    const isAdminDomain = hostname.includes('admin.');

    // Chỉ lấy token đúng theo domain hiện tại
    const cookies = req.cookies || {};
    const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
    const token = cookies[tokenName];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập!"
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // Nếu đang ở admin domain mà role không phải admin → chặn
        if (isAdminDomain && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!"
            });
        }

        next();
    } catch (err) {
        console.error("Token error:", err.message);

        // Xóa cookie lỗi đúng domain
        const targetDomain = isAdminDomain ? ADMIN_DOMAIN : USER_DOMAIN;
        res.clearCookie(tokenName, {
            ...BASE_COOKIE_CONFIG,
            domain: targetDomain
        });

        return res.status(401).json({
            success: false,
            message: "Phiên làm việc hết hạn hoặc không hợp lệ!"
        });
    }
};

module.exports = AuthMiddleware;

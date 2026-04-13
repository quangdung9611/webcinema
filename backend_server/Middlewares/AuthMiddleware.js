const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Cấu hình cookie dọn dẹp (PHẢI giống hệt lúc set ở AuthController)
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/' // Quan trọng: Phải khớp path mới xóa được
};

const AuthMiddleware = (req, res, next) => {
    // Kiểm tra xem request có phải gửi đến các route của Admin không
    const isAdminPath = req.originalUrl.startsWith('/admin/api');

    // 1. Lấy token tương ứng từ cookie
    const token = isAdminPath ? req.cookies.admintoken : req.cookies.usertoken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 2. Kiểm tra quyền Admin nếu truy cập đường dẫn admin
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 3. XÓA TOKEN KHI LỖI: 
        // Đã xóa bỏ thuộc tính 'domain' để khớp với AuthController
        const tokenName = isAdminPath ? 'admintoken' : 'usertoken';

        res.clearCookie(tokenName, BASE_COOKIE_CONFIG);

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn hoặc không hợp lệ!"
        });
    }
};

module.exports = AuthMiddleware;
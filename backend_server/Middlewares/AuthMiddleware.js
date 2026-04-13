const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// 🔥 ÉP CỨNG DOMAIN: Phải giống hệt bên AuthController
const USER_DOMAIN = "quangdungcinema.id.vn";
const ADMIN_DOMAIN = "admin.quangdungcinema.id.vn"; 

// Cấu hình cookie dọn dẹp
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/' 
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
        // 🔥 PHẢI truyền đúng domain tương ứng thì trình duyệt mới cho xóa
        const tokenName = isAdminPath ? 'admintoken' : 'usertoken';
        const targetDomain = isAdminPath ? ADMIN_DOMAIN : USER_DOMAIN;

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
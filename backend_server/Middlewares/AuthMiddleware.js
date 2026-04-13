const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

// 🔥 QUAN TRỌNG: Dùng chung một Domain gốc có dấu chấm
const SHARED_DOMAIN = ".quangdungcinema.id.vn";

const AuthMiddleware = (req, res, next) => {
    // 1. Nhận diện request admin dựa trên URL (prefix /admin/api ông đã đặt ở server.js)
    const isAdminPath = req.originalUrl.startsWith('/admin/api');

    // 2. Lấy token (ưu tiên admintoken nếu đang gọi API admin)
    const token = isAdminPath 
        ? (req.cookies.admintoken || req.cookies.usertoken) 
        : req.cookies.usertoken;

    // 3. Check tồn tại
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        // 4. Decode token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 5. Kiểm tra quyền truy cập Admin
        // Nếu request vào đường dẫn admin mà role không phải admin thì chặn ngay
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 🔥 XÓA COOKIE SẠCH SẼ THEO DOMAIN CHUNG
        const clearOptions = {
            ...BASE_COOKIE_CONFIG,
            domain: SHARED_DOMAIN,
            path: '/'
        };

        res.clearCookie('admintoken', clearOptions);
        res.clearCookie('usertoken', clearOptions);

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn!"
        });
    }
};

module.exports = AuthMiddleware;
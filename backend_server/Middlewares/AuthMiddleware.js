const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// 🔥 Dùng chung domain gốc có dấu chấm để bao phủ toàn bộ subdomain
const COMMON_DOMAIN = ".quangdungcinema.id.vn";

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: COMMON_DOMAIN, // 🔥 Bắt buộc để khớp với AuthController
    path: '/' 
};

const AuthMiddleware = (req, res, next) => {
    // 1. Xác định loại API đang gọi (Dựa trên tiền tố route)
    const isAdminPath = req.originalUrl.startsWith('/admin/api');

    // 2. Lấy token tương ứng từ cookie
    const cookies = req.cookies || {};
    const token = isAdminPath ? cookies.admintoken : cookies.usertoken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 3. Kiểm tra chéo quyền hạn
        // Nếu dùng usertoken để vào link admin thì chặn đứng
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 4. DỌN SẠCH COOKIE KHI LỖI (Hết hạn hoặc giả mạo)
        // Việc dùng COMMON_DOMAIN ở đây giúp xóa sạch cookie cũ dù bạn đang ở subdomain nào
        const tokenName = isAdminPath ? 'admintoken' : 'usertoken';
        
        res.clearCookie(tokenName, BASE_COOKIE_CONFIG);

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn hoặc không hợp lệ!"
        });
    }
};

module.exports = AuthMiddleware;
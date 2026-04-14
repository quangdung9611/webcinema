const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// 🔥 PHÂN CHIA DOMAIN ĐÚNG VỚI AUTHCONTROLLER
const USER_DOMAIN = "www.quangdungcinema.id.vn";
const ADMIN_DOMAIN = "admin.quangdungcinema.id.vn";

const AuthMiddleware = (req, res, next) => {
    // 1. Xác định môi trường dựa trên Hostname (Tên miền đang gọi API)
    const hostname = req.hostname; 
    const isAdminDomain = hostname.includes('admin.');

    // 2. Lấy ĐÚNG token của domain đó
    // Trình duyệt bây giờ sẽ chỉ gửi admintoken nếu đang ở admin.quangdungcinema.id.vn
    const cookies = req.cookies || {};
    const token = isAdminDomain ? cookies.admintoken : cookies.usertoken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 3. Kiểm tra chéo quyền hạn (Chống trường hợp lấy token user gắn vào admin)
        if (isAdminDomain && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 4. XÓA COOKIE KHI LỖI: Phải xóa đúng "hộ khẩu" nó mới mất
        const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
        const targetDomain = isAdminDomain ? ADMIN_DOMAIN : USER_DOMAIN;

        res.clearCookie(tokenName, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: targetDomain, // 🔥 Xóa đúng domain đã cấp
            path: '/' 
        });

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn hoặc không hợp lệ!"
        });
    }
};

module.exports = AuthMiddleware;
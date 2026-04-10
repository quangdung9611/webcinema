const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 1. PHÂN QUYỀN THÔNG MINH
    let token;
    if (isAdminPath) {
        // Nếu vào cổng Admin: BẮT BUỘC phải dùng admintoken
        token = req.cookies.admintoken;
    } else {
        // Nếu vào cổng Khách hàng: Ưu tiên usertoken, nếu không có thì dùng admintoken
        // (Điều này giúp Admin có thể xem được phim/ghế ở trang chủ mà không cần log acc user)
        token = req.cookies.usertoken || req.cookies.admintoken;
    }

    // 2. Kiểm tra sự tồn tại của chìa khóa
    if (!token) {
        return res.status(401).json({ 
            message: `Bạn chưa đăng nhập vào hệ thống ${isAdminPath ? 'Quản trị' : 'Khách hàng'}!` 
        });
    }

    try {
        // 3. Giải mã Token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 4. KIỂM TRA ROLE NGHIÊM NGẶT CHO ADMIN
        // Nếu vào path admin mà role trong token không phải admin -> Chặn
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Lỗi: Bạn không có quyền Quản trị viên!" });
        }

        // 5. Nếu vào path khách hàng nhưng dùng token admin -> Vẫn cho qua (Quyền tối thượng)
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực:", err.message);
        return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!" });
    }
};

module.exports = AuthMiddleware;
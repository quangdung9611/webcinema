const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Cấu hình gốc (Bỏ path cứng ở đây để linh hoạt trong hàm xóa)
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN VÙNG TRUY CẬP
    // Kiểm tra xem request có đang gọi vào các API dành cho Admin không
    const isAdminPath = req.originalUrl.includes('/api/admin') || req.originalUrl.includes('/api/manage');

    // 2. LẤY TOKEN BIỆT LẬP
    // Nếu vào path admin -> CHỈ đọc admintoken
    // Nếu vào path khác -> CHỈ đọc usertoken
    const token = isAdminPath ? req.cookies.admintoken : req.cookies.usertoken;

    // 3. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            message: isAdminPath 
                ? "Phiên làm việc admin hết hạn, vui lòng đăng nhập lại!" 
                : "Vui lòng đăng nhập để sử dụng tính năng này!" 
        });
    }

    try {
        // 4. GIẢI MÃ TOKEN
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; 

        // 5. KIỂM TRA QUYỀN TRUY CẬP (ROLE) DỰA TRÊN PATH
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: "Truy cập bị từ chối: Bạn không có quyền Quản trị!" 
            });
        }

        // 6. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // TÁCH BIỆT & DỨT KHOÁT: Xóa sạch dấu vết khi token sai/hết hạn
        // Phải truyền đúng PATH thì trình duyệt mới chịu xóa thẻ đó
        if (isAdminPath) {
            res.clearCookie('admintoken', { ...BASE_COOKIE_CONFIG, path: '/admin', maxAge: 0 });
        } else {
            res.clearCookie('usertoken', { ...BASE_COOKIE_CONFIG, path: '/', maxAge: 0 });
        }

        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
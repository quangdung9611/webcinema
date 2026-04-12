const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Cấu hình gốc
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN VÙNG TRUY CẬP (ĐÃ CẬP NHẬT THEO admin/api)
    // Kiểm tra xem request có đang gọi vào các API dành cho Admin không
    // Bây giờ URL của ông sẽ có dạng: /admin/api/auth/me hoặc /admin/api/products
    const isAdminPath = req.originalUrl.includes('/admin/api');

    // 2. LẤY TOKEN BIỆT LẬP
    // Nếu vào path admin/api -> CHỈ đọc admintoken (vì cookie này nằm ở path /admin)
    // Nếu vào path khác -> CHỈ đọc usertoken (vì cookie này nằm ở path /)
    const token = isAdminPath ? req.cookies.admintoken : req.cookies.usertoken;

    // 3. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            message: isAdminPath 
                ? "Phiên làm việc admin không tồn tại hoặc hết hạn!" 
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
        
        // TÁCH BIỆT & DỨT KHOÁT: Xóa đúng thẻ ở đúng Path khi lỗi
        if (isAdminPath) {
            // Khi xóa admintoken, phải để đúng path /admin như lúc cấp
            res.clearCookie('admintoken', { ...BASE_COOKIE_CONFIG, path: '/admin', maxAge: 0 });
        } else {
            // Khi xóa usertoken, để path /
            res.clearCookie('usertoken', { ...BASE_COOKIE_CONFIG, path: '/', maxAge: 0 });
        }

        return res.status(401).json({ 
            message: "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
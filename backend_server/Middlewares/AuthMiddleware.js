const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Cấu hình phải khớp 100% với Controller để lệnh clearCookie có tác dụng
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
};

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN VÙNG TRUY CẬP
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 2. LẤY TOKEN THÔNG MINH
    // Ưu tiên lấy admintoken trước nếu đang vào path admin, hoặc lấy bất cứ thẻ nào có sẵn
    const token = req.cookies.admintoken || req.cookies.usertoken;

    // 3. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            message: isAdminPath 
                ? "Vui lòng đăng nhập quyền Quản trị viên!" 
                : "Vui lòng đăng nhập để sử dụng tính năng này!" 
        });
    }

    try {
        // 4. GIẢI MÃ TOKEN
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; 

        // 5. KIỂM TRA QUYỀN TRUY CẬP (ROLE)
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
        const clearOptions = { ...BASE_COOKIE_CONFIG, maxAge: 0 };
        res.clearCookie('usertoken', clearOptions);
        res.clearCookie('admintoken', clearOptions);

        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
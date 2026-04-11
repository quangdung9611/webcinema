const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN LÀN ĐƯỜNG (Cực kỳ quan trọng để khớp với Path Cookie)
    // Kiểm tra xem request đang gọi vào cổng Admin hay cổng Khách
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 2. LẤY TOKEN THEO CỔNG TRUY CẬP
    let token;
    if (isAdminPath) {
        // Cổng Admin: Trình duyệt chỉ gửi admintoken (do mình set path: '/api')
        token = req.cookies.admintoken;
    } else {
        // Cổng Khách: Ưu tiên usertoken, nếu không có thì dùng tạm admintoken (quyền tối thượng)
        // Điều này giúp Admin khi đang ở trang chủ vẫn có thể mua vé, xem profile...
        token = req.cookies.usertoken || req.cookies.admintoken;
    }

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

        // 5. KIỂM TRA ROLE NGHIÊM NGẶT
        // Nếu vào làn đường Admin mà role trong token không phải 'admin' -> CHẶN NGAY
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Truy cập bị từ chối: Bạn không có quyền Quản trị!" });
        }

        // 6. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // Trả về lỗi 401 để Frontend (AuthContext) biết mà setUser(null)
        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!",
            error: err.message 
        });
    }
};

module.exports = AuthMiddleware;
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // Kiểm tra xem request đang gọi vào cổng Admin hay cổng Khách
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 1. LẤY TOKEN THEO CỔNG TRUY CẬP
    let token;
    if (isAdminPath) {
        // Cổng Admin: Chỉ chấp nhận admintoken
        token = req.cookies.admintoken;
    } else {
        // Cổng Khách: Ưu tiên usertoken, nếu không có thì dùng tạm admintoken (quyền tối thượng)
        token = req.cookies.usertoken || req.cookies.admintoken;
    }

    // 2. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            message: isAdminPath 
                ? "Vui lòng đăng nhập quyền Quản trị viên!" 
                : "Vui lòng đăng nhập để sử dụng tính năng này!" 
        });
    }

    try {
        // 3. GIẢI MÃ TOKEN
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 4. KIỂM TRA ROLE NGHIÊM NGẶT
        // Nếu vào đường dẫn /api/admin/... mà role trong token không phải 'admin' -> CHẶN
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Truy cập bị từ chối: Bạn không có quyền Quản trị!" });
        }

        // 5. CHO PHÉP ĐI TIẾP
        // Lúc này req.user đã có dữ liệu, các Controller (như getMe) có thể sử dụng
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // Nếu token sai hoặc hết hạn, ta nên báo lỗi rõ ràng để Frontend biết mà đá user ra trang Login
        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!",
            error: err.message 
        });
    }
};

module.exports = AuthMiddleware;
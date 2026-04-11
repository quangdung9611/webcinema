const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN LÀN ĐƯỜNG (Khớp với cấu trúc URL trình duyệt)
    // Nếu request gọi vào các API có tiền tố /admin (hoặc từ trang quản trị)
    const isAdminPath = req.originalUrl.includes('/admin');

    // 2. LẤY TOKEN THEO CỔNG TRUY CẬP
    let token;
    if (isAdminPath) {
        // Cổng Admin: Trình duyệt sẽ gửi admintoken (do mình set path: '/admin')
        token = req.cookies.admintoken;
    } else {
        // Cổng Khách: Trình duyệt gửi usertoken (do mình set path: '/')
        // Nếu usertoken không có, kiểm tra admintoken (để admin dạo chơi trang chủ vẫn mua vé được)
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
        // Nếu đang cố truy cập làn đường Admin mà Role trong token không phải 'admin' -> CHẶN
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Truy cập bị từ chối: Bạn không có quyền Quản trị!" });
        }

        // 6. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // Trả về lỗi 401 để Frontend (AuthContext) biết đường xử lý đăng xuất
        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ!",
            error: err.message 
        });
    }
};

module.exports = AuthMiddleware;
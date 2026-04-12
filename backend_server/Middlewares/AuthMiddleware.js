const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN VÙNG TRUY CẬP
    // Kiểm tra xem request có đang gọi vào các API dành riêng cho Admin không
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 2. LẤY TOKEN THÔNG MINH
    // Vì mình đã set path: '/' cho cả 2 loại thẻ, nên trình duyệt sẽ gửi cả 2 (nếu có)
    // Nhưng do logic Login mình đã clear sạch thẻ cũ, nên thường chỉ có 1 thẻ tồn tại.
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

        // 5. KIỂM TRA QUYỀN TRUY CẬP (ROLE TRONG BẢNG USERS)
        // Nếu đang vào vùng Admin mà Role trong Token không phải 'admin' -> CHẶN
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: "Truy cập bị từ chối: Bạn không có quyền Quản trị!" 
            });
        }

        // 6. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // Nếu token sai hoặc hết hạn, xóa sạch dấu vết ở client luôn cho chắc
        res.clearCookie('usertoken', { path: '/', sameSite: 'none', secure: true });
        res.clearCookie('admintoken', { path: '/', sameSite: 'none', secure: true });

        return res.status(401).json({ 
            message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
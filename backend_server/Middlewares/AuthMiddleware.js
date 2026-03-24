const jwt = require('jsonwebtoken');

// Dũng nhớ kiểm tra trên Render xem biến môi trường là SECRET_KEY hay JWT_SECRET nhé
const SECRET_KEY = process.env.SECRET_KEY || process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. Kiểm tra xem Request đang gọi vào luồng Admin hay User
    // Mình check xem trong URL có chứa cụm '/api/admin' không
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 2. PHÂN QUYỀN RÕ RÀNG: Chỗ nào dùng token đó
    let token;
    if (isAdminPath) {
        // Cửa Admin: Chỉ bốc admintoken
        token = req.cookies.admintoken;
    } else {
        // Cửa Khách hàng: Chỉ bốc usertoken
        token = req.cookies.usertoken;
    }

    // 3. Nếu không có chìa khóa phù hợp -> Đuổi ra ngay
    if (!token) {
        return res.status(401).json({ 
            message: `Bạn chưa đăng nhập vào hệ thống ${isAdminPath ? 'Quản trị' : 'Khách hàng'}!` 
        });
    }

    try {
        // 4. Giải mã Token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 5. KIỂM TRA ROLE (Chống râu ông nọ cắm cằm bà kia)
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Lỗi: Bạn không có quyền Quản trị viên!" });
        }
        
        // Nếu là khách hàng bình thường (isAdminPath = false) 
        // mà token lại là của admin thì vẫn cho qua (để Admin vào xem được trang chủ)
        // Còn nếu Dũng muốn tách biệt 100% thì bật đoạn dưới này lên:
        /*
        if (!isAdminPath && req.user.role === 'admin' && !req.cookies.usertoken) {
             return res.status(403).json({ message: "Vui lòng dùng tài khoản khách hàng!" });
        }
        */

        next();
    } catch (err) {
        console.error("Lỗi xác thực:", err.message);
        return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!" });
    }
};
module.exports = AuthMiddleware;
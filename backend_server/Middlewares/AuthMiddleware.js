const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const authMiddleware = (req, res, next) => {
    // 1. Kiểm tra xem Request đang gọi vào đầu /admin hay đầu /api (User)
    const isAdminPath = req.originalUrl.includes('/admin');

    // 2. PHÂN QUYỀN RÕ RÀNG: Chỗ nào dùng token đó
    let token;
    if (isAdminPath) {
        // Cổng ADMIN: Chỉ chấp nhận admintoken
        token = req.cookies.admintoken;
    } else {
        // Cổng CUSTOMER: Chỉ chấp nhận usertoken
        token = req.cookies.usertoken;
    }

    // 3. Nếu không có đúng loại chìa khóa -> Đuổi ra ngay
    if (!token) {
        return res.status(401).json({ 
            message: `Bạn chưa đăng nhập vào hệ thống ${isAdminPath ? 'Quản trị' : 'Khách hàng'}!` 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 4. KIỂM TRA ROLE (Rất quan trọng để không bị râu ông nọ cắm cằm bà kia)
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Lỗi: Bạn không phải Quản trị viên!" });
        }
        
        if (!isAdminPath && req.user.role === 'admin') {
            // Nếu Admin muốn xem trang Client, họ phải đăng nhập bằng tài khoản Customer riêng 
            // Hoặc Dũng có thể cho phép Admin xem (tùy Dũng), nhưng tốt nhất là tách bạch.
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ!" });
    }
};

module.exports = authMiddleware;
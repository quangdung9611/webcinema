const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. NHẬN DIỆN LÀN ĐƯỜNG
    // Kiểm tra xem request có phải gửi tới các endpoint dành cho Admin không
    const isAdminPath = req.originalUrl.includes('/api/admin');

    // 2. LẤY TOKEN THEO CỔNG TRUY CẬP
    let token;
    
    // Nếu gọi vào link admin, bắt buộc phải dùng admintoken
    if (isAdminPath) {
        token = req.cookies.admintoken;
    } else {
        // Nếu ở trang khách, ưu tiên usertoken, nếu không có mới xét tới admintoken
        token = req.cookies.usertoken || req.cookies.admintoken;
    }

    // 3. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            message: isAdminPath 
                ? "Vui lòng đăng nhập với quyền Quản trị viên!" 
                : "Vui lòng đăng nhập để thực hiện thao tác này!" 
        });
    }

    try {
        // 4. GIẢI MÃ TOKEN
        const decoded = jwt.verify(token, SECRET_KEY);
        
        // Gán dữ liệu đã giải mã (user_id, role) vào req.user để các hàm sau sử dụng
        req.user = decoded;

        // 5. KIỂM TRA QUYỀN TRUY CẬP (ROLE-BASED ACCESS CONTROL)
        // Nếu truy cập làn Admin mà Role trong Token không phải admin thì chặn
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: "Bạn không có quyền truy cập vào khu vực Quản trị!" 
            });
        }

        // 6. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        
        // Nếu token sai hoặc hết hạn, trả về 401
        // Lưu ý: Tên message nên thống nhất để Frontend dễ bắt lỗi
        return res.status(401).json({ 
            message: "Phiên làm việc không hợp lệ hoặc đã hết hạn!",
            error: err.message 
        });
    }
};

module.exports = AuthMiddleware;
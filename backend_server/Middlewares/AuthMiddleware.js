const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const authMiddleware = (req, res, next) => {
    // 1. Kiểm tra khu vực truy cập dựa trên URL
    // Lưu ý: Route admin của bạn thường có tiền tố /admin (ví dụ: /admin/api/auth/admin/me)
    const isAdminPath = req.originalUrl.includes('/admin');
    
    // 2. LOGIC BỐC TOKEN: Đảm bảo không bị "đá" nhau
    let token;
    if (isAdminPath) {
        // Nếu vào link Admin -> BẮT BUỘC dùng admintoken
        token = req.cookies.admintoken;
    } else {
        // Nếu vào link Client (Trang chủ) -> Ưu tiên usertoken trước
        // Nếu không có usertoken mới lấy admintoken (để Admin vẫn xem được trang Client)
        token = req.cookies.usertoken || req.cookies.admintoken;
    }

    // DEBUG: Dũng kiểm tra log ở Terminal để xem nó bốc đúng token không
    console.log(`[Auth] URL: ${req.originalUrl} | AdminArea: ${isAdminPath} | Status: ${token ? 'Token Found' : 'No Token'}`);

    if (!token) {
        return res.status(401).json({ 
            message: `Bạn chưa đăng nhập ${isAdminPath ? 'vào hệ thống Quản trị' : ''}!` 
        });
    }

    try {
        // 3. Giải mã Token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 4. KIỂM TRA QUYỀN (Rất quan trọng)
        // Nếu đang vào link Admin mà token giải mã ra role không phải 'admin' -> CHẶN
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: "Bạn không có quyền truy cập khu vực Quản trị viên!" 
            });
        }

        // Nếu mọi thứ ok, cho đi tiếp
        next();
    } catch (err) {
        console.error("Lỗi xác thực:", err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn!" });
        }
        
        return res.status(401).json({ 
            message: "Xác thực không hợp lệ, vui lòng đăng nhập lại!" 
        });
    }
};

module.exports = authMiddleware;
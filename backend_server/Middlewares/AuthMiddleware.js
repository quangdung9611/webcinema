const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const AuthMiddleware = (req, res, next) => {
    // 1. Xác định môi trường dựa trên Hostname
    const hostname = req.hostname; 
    const isAdminDomain = hostname.includes('admin.');

    // 2. Lấy token theo domain
    const cookies = req.cookies || {};
    const token = isAdminDomain ? cookies.admintoken : cookies.usertoken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 3. Kiểm tra quyền hạn
        if (isAdminDomain && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 4. Xóa cookie khi lỗi
        const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';

        res.clearCookie(tokenName, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/' 
        });

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn hoặc không hợp lệ!"
        });
    }
};

module.exports = AuthMiddleware;

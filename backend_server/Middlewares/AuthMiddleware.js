const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {
    const isAdminPath = req.originalUrl.startsWith('/admin/api');

    // 🔥 1. TÁCH BIỆT TUYỆT ĐỐI: 
    // Admin path THÌ CHỈ lấy admintoken. User path THÌ CHỈ lấy usertoken.
    const token = isAdminPath ? req.cookies.admintoken : req.cookies.usertoken;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 2. Kiểm tra chéo Role để đảm bảo an toàn
        if (isAdminPath && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Bạn không có quyền truy cập vùng quản trị!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 3. Xóa đúng cái token đang gây lỗi tại đúng Domain của nó
        const domainToDelete = isAdminPath ? "admin.quangdungcinema.id.vn" : "quangdungcinema.id.vn";

        res.clearCookie(isAdminPath ? 'admintoken' : 'usertoken', {
            ...BASE_COOKIE_CONFIG,
            domain: domainToDelete,
            path: '/'
        });

        return res.status(401).json({ 
            success: false,
            message: "Phiên làm việc hết hạn!"
        });
    }
};

module.exports = AuthMiddleware;
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {

    // 1. Lấy token (ưu tiên admin)
    const token = req.cookies.admintoken || req.cookies.usertoken;

    // 2. Check tồn tại
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập!" 
        });
    }

    try {
        // 3. Decode token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // 4. Check admin domain
        const isAdminDomain = req.hostname === "admin.quangdungcinema.id.vn";

        if (isAdminDomain && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Không có quyền truy cập admin!" 
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 🔥 XÓA COOKIE ĐÚNG CÁCH (KHÔNG DOMAIN)
        res.clearCookie('admintoken', {
            ...BASE_COOKIE_CONFIG,
            path: '/'
        });

        res.clearCookie('usertoken', {
            ...BASE_COOKIE_CONFIG,
            path: '/'
        });

        return res.status(401).json({ 
            success: false,
            message: "Phiên hết hạn, đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
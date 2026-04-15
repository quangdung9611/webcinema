const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

/**
 * 🔥 HÀM TRỢ GIÚP LẤY CẤU HÌNH COOKIE
 * Phải khớp hoàn toàn với AuthController để lệnh clearCookie có tác dụng
 */
const getCookieConfig = () => {
    return {
        httpOnly: true,
        secure: true,      // Bắt buộc trên Render/HTTPS
        sameSite: 'None',  // 🔥 QUAN TRỌNG: Phải khớp với lúc set cookie
        path: '/'
        // ❌ KHÔNG set domain ở đây
    };
};

// --- HÀM GIẢI MÃ TOKEN (INTERNAL) ---
const verifyToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
};

// -----------------------------------------------------------
// 1. MIDDLEWARE TỔNG QUÁT (Dùng cho GetMe hoặc check chung)
// -----------------------------------------------------------
exports.authGeneral = (req, res, next) => {
    const origin = req.get('origin') || "";
    const isAdminDomain = origin.includes('admin.');
    
    // Tên token vẫn tách biệt: usertoken cho khách, admintoken cho admin
    const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
    const token = req.cookies[tokenName];

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        // Xóa cookie nếu hết hạn (Dùng config không domain)
        res.clearCookie(tokenName, getCookieConfig());
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;

    // Chốt chặn cuối: Admin domain chỉ cho phép role admin vào
    if (isAdminDomain && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Bạn không có quyền quản trị!" });
    }

    next();
};

// -----------------------------------------------------------
// 2. MIDDLEWARE CHỈ DÀNH CHO ADMIN
// -----------------------------------------------------------
exports.verifyAdmin = (req, res, next) => {
    const token = req.cookies.admintoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Yêu cầu quyền Admin!" });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
        res.clearCookie('admintoken', getCookieConfig());
        return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối!" });
    }

    req.user = decoded;
    next();
};

// -----------------------------------------------------------
// 3. MIDDLEWARE CHỈ DÀNH CHO USER
// -----------------------------------------------------------
exports.verifyUser = (req, res, next) => {
    const token = req.cookies.usertoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie('usertoken', getCookieConfig());
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;
    next();
};
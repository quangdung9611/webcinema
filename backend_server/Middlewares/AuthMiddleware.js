const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// 🔥 Dùng chung domain cha để tránh lỗi tam giác vàng
const SHARED_DOMAIN = ".quangdungcinema.id.vn";

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: SHARED_DOMAIN, // Luôn trỏ về domain cha khi xóa cookie
    path: '/'
};

// --- HÀM TRỢ GIÚP (INTERNAL) ---
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
    const hostname = req.hostname;
    const isAdminDomain = hostname.startsWith('admin.');
    
    const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
    const token = req.cookies[tokenName];

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie(tokenName, BASE_COOKIE_CONFIG);
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;

    // Bảo vệ vùng Admin
    if (isAdminDomain && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Bạn không có quyền quản trị!" });
    }

    next();
};

// -----------------------------------------------------------
// 2. MIDDLEWARE CHỈ DÀNH CHO ADMIN (Chặn tuyệt đối)
// -----------------------------------------------------------
exports.verifyAdmin = (req, res, next) => {
    const token = req.cookies.admintoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Yêu cầu quyền Admin!" });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
        res.clearCookie('admintoken', BASE_COOKIE_CONFIG);
        return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối!" });
    }

    req.user = decoded;
    next();
};

// -----------------------------------------------------------
// 3. MIDDLEWARE CHỈ DÀNH CHO USER (Customer)
// -----------------------------------------------------------
exports.verifyUser = (req, res, next) => {
    const token = req.cookies.usertoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập (User)!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie('usertoken', BASE_COOKIE_CONFIG);
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;
    next();
};
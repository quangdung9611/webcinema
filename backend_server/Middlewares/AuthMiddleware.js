const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

/**
 * 🔥 HÀM TRỢ GIÚP LẤY CẤU HÌNH COOKIE ĐÍCH DANH
 * Phải khớp với bên AuthController thì mới xóa (clear) cookie được
 */
const getCookieConfig = (req) => {
    return {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        domain: req.hostname, // 🔥 Lấy domain hiện tại: admin... hoặc quangdung...
        path: '/'
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
    const hostname = req.hostname;
    // Kiểm tra xem có đang ở subdomain admin hay không
    const isAdminDomain = hostname.startsWith('admin.');
    
    // Ở trang admin thì tìm admintoken, trang chủ thì tìm usertoken
    const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
    const token = req.cookies[tokenName];

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        // Xóa cookie đúng domain nếu token lởm hoặc hết hạn
        res.clearCookie(tokenName, getCookieConfig(req));
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;

    // Bảo vệ vùng Admin: Nếu ở domain admin mà role không phải admin thì đuổi thẳng
    if (isAdminDomain && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Bạn không có quyền quản trị!" });
    }

    next();
};

// -----------------------------------------------------------
// 2. MIDDLEWARE CHỈ DÀNH CHO ADMIN (Dùng cho các API quản lý)
// -----------------------------------------------------------
exports.verifyAdmin = (req, res, next) => {
    const token = req.cookies.admintoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Yêu cầu quyền Admin!" });
    }

    const decoded = verifyToken(token);
    // Phải là admin thì mới cho qua
    if (!decoded || decoded.role !== 'admin') {
        res.clearCookie('admintoken', getCookieConfig(req));
        return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối!" });
    }

    req.user = decoded;
    next();
};

// -----------------------------------------------------------
// 3. MIDDLEWARE CHỈ DÀNH CHO USER (Customer mua vé)
// -----------------------------------------------------------
exports.verifyUser = (req, res, next) => {
    const token = req.cookies.usertoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie('usertoken', getCookieConfig(req));
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;
    next();
};
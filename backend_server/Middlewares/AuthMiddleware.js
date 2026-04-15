const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

/**
 * 🔥 HÀM TRỢ GIÚP LẤY CẤU HÌNH COOKIE ĐÍCH DANH
 * Phải khớp 100% với bên AuthController thì mới xóa (clear) cookie được
 */
const getCookieConfig = (req) => {
    let targetDomain = req.hostname; 

    // Lấy domain của Frontend gửi request tới (Dùng origin để bẻ lái domain)
    const origin = req.get('origin') || "";

    if (origin.includes('admin.quangdungcinema.id.vn')) {
        targetDomain = 'admin.quangdungcinema.id.vn';
    } 
    else if (origin.includes('quangdungcinema.id.vn')) {
        targetDomain = 'quangdungcinema.id.vn';
    }

    return {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        domain: targetDomain, // 🔥 Đã bẻ lái để khớp với domain chứa cookie
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
    // Check origin để biết đang ở domain nào
    const origin = req.get('origin') || "";
    const isAdminDomain = origin.includes('admin.');
    
    // Ở trang admin thì tìm admintoken, trang chủ thì tìm usertoken
    const tokenName = isAdminDomain ? 'admintoken' : 'usertoken';
    const token = req.cookies[tokenName];

    if (!token) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        // Xóa cookie đúng domain nếu token hết hạn
        res.clearCookie(tokenName, getCookieConfig(req));
        return res.status(401).json({ success: false, message: "Phiên làm việc hết hạn!" });
    }

    req.user = decoded;

    // Bảo vệ vùng Admin: Check role nếu đang đứng ở domain admin
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
    if (!decoded || decoded.role !== 'admin') {
        // Xóa token nếu không hợp lệ hoặc sai quyền
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
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

// Khai báo domain đồng bộ với AuthController
const USER_DOMAIN = "quangdungcinema.id.vn";
const ADMIN_DOMAIN = "admin.quangdungcinema.id.vn";

const AuthMiddleware = (req, res, next) => {

    // 1. Lấy token (ưu tiên admin nếu đang ở domain admin)
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
        const isAdminDomain = req.hostname === ADMIN_DOMAIN;

        if (isAdminDomain && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Không có quyền truy cập admin!" 
                // Ở đây không xóa cookie vì có thể họ đang login user nhầm tab
            });
        }

        next();

    } catch (err) {
        console.error("Token error:", err.message);

        // 🔥 PHẢI XÓA COOKIE KÈM DOMAIN MỚI SẠCH ĐƯỢC
        res.clearCookie('admintoken', {
            ...BASE_COOKIE_CONFIG,
            domain: ADMIN_DOMAIN, // Thêm vào đây
            path: '/'
        });

        res.clearCookie('usertoken', {
            ...BASE_COOKIE_CONFIG,
            domain: USER_DOMAIN,  // Thêm vào đây
            path: '/'
        });

        return res.status(401).json({ 
            success: false,
            message: "Phiên hết hạn, đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
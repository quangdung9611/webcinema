const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {
    // 1. XÁC ĐỊNH TOKEN CẦN LẤY DỰA TRÊN ĐƯỜNG DẪN (URL)
    const isAccessingAdmin = req.originalUrl.includes('/admin');
    
    // Nếu là API admin thì ưu tiên lấy admintoken, nếu là API thường thì lấy usertoken
    const token = isAccessingAdmin ? req.cookies.admintoken : req.cookies.usertoken;

    // 2. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập để thực hiện thao tác này!" 
        });
    }

    try {
        // 3. GIẢI MÃ TOKEN
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // { user_id, role, ... }

        // 4. KIỂM TRA QUYỀN TRUY CẬP NGHIÊM NGẶT
        // Nếu API dành cho admin mà trong token role không phải admin -> Chặn
        if (isAccessingAdmin && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Quyền hạn của bạn không đủ để vào khu vực quản trị!" 
            });
        }

        // 5. CHO PHÉP ĐI TIẾP
        next();
        
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        
        // Chỉ xóa đúng cái token đang bị lỗi để không ảnh hưởng đến tab còn lại (nếu có)
        if (isAccessingAdmin) {
            res.clearCookie('admintoken', { ...BASE_COOKIE_CONFIG, path: '/admin' });
        } else {
            res.clearCookie('usertoken', { ...BASE_COOKIE_CONFIG, path: '/' });
        }

        return res.status(401).json({ 
            success: false,
            message: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
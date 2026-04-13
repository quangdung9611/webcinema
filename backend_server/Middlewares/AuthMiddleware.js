const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const AuthMiddleware = (req, res, next) => {
    // 1. THỬ LẤY ADMIN TOKEN TRƯỚC, NẾU KHÔNG CÓ THÌ LẤY USER TOKEN
    // Cách này giúp ông đứng ở đâu cũng có thể check được role
    const token = req.cookies.admintoken || req.cookies.usertoken;

    // 2. KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Vui lòng đăng nhập để thực hiện thao tác này!" 
        });
    }

    try {
        // 3. GIẢI MÃ TOKEN ĐỂ LẤY ROLE
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Trong này sẽ có { user_id, role, ... }

        // 4. KIỂM TRA ROLE TRỰC TIẾP TỪ TOKEN
        // Nếu URL có chứa chữ /admin nhưng role trong token không phải admin thì chặn
        const isAccessingAdmin = req.originalUrl.includes('/admin');
        
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
        
        // Khi lỗi, xóa cả 2 cho sạch máy nếu cần
        res.clearCookie('admintoken', { ...BASE_COOKIE_CONFIG, path: '/admin' });
        res.clearCookie('usertoken', { ...BASE_COOKIE_CONFIG, path: '/' });

        return res.status(401).json({ 
            success: false,
            message: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!"
        });
    }
};

module.exports = AuthMiddleware;
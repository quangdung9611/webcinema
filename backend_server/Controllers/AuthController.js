const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

/**
 * 🔥 HÀM TẠO CẤU HÌNH COOKIE ĐÍCH DANH
 * Giúp tách biệt hoàn toàn usertoken và admintoken
 */
const getCookieConfig = (req) => {
    const origin = req.get('origin') || "";
    let targetDomain = "";

    // Tách lấy domain sạch từ origin (bỏ https://)
    if (origin) {
        targetDomain = origin.replace(/^https?:\/\//, '').split(':')[0];
    }

    // Nếu là localhost thì không set domain để trình duyệt tự nhận
    if (targetDomain.includes('localhost')) {
        return {
            httpOnly: true,
            secure: false, // Localhost thường không có HTTPS
            sameSite: 'Lax',
            path: '/'
        };
    }

    return {
        httpOnly: true,
        secure: true,    // Bắt buộc trên Render/Vercel
        sameSite: 'Lax', 
        domain: targetDomain, // 🔥 Cắm đúng "hộ khẩu" trang nào thì cookie nằm trang đó
        path: '/',
    };
};

// -----------------------------------------------------------
// 1. REGISTER
// -----------------------------------------------------------
exports.register = async (req, res) => {
    const { username, full_name, phone, address, email, password, role } = req.body;
    try {
        if (!full_name || full_name.length < 8) {
            return res.status(400).json({ field: 'full_name', message: "Họ tên phải từ 8 ký tự trở lên" });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ field: 'password', message: "Mật khẩu yếu!" });
        }
        const [existing] = await db.query(
            'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ?',
            [username, email, phone]
        );
        if (existing.length > 0) {
            const user = existing[0];
            const field = user.username === username ? 'username' : user.email === email ? 'email' : 'phone';
            return res.status(400).json({ field, message: `${field} đã tồn tại` });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const finalRole = role || 'customer';
        const [result] = await db.query(
            `INSERT INTO users (username, full_name, phone, address, email, password, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, full_name, phone, address || '', email, hashedPassword, finalRole]
        );
        res.status(201).json({ message: "Đăng ký thành công", userId: result.insertId });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// -----------------------------------------------------------
// 2. LOGIN (Tách biệt tuyệt đối Token)
// -----------------------------------------------------------
exports.login = async (req, res) => {
    const { email, password, role_input } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: "Sai thông tin" });

        const user = users[0];
        if (role_input && user.role !== role_input) {
            return res.status(403).json({ message: "Sai quyền truy cập" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Sai thông tin" });

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        const cookieConfig = getCookieConfig(req);
        const origin = req.get('origin') || "";

        // 🔥 LOGIC TÁCH BIỆT TOKEN:
        // Đứng ở domain admin thì chỉ cấp admintoken
        if (origin.includes('admin.')) {
            res.cookie('admintoken', token, {
                ...cookieConfig,
                maxAge: 24 * 60 * 60 * 1000
            });
            // Xóa usertoken nếu lỡ có (để sạch máy)
            res.clearCookie('usertoken', cookieConfig);
        } 
        // Đứng ở domain chính thì chỉ cấp usertoken
        else {
            res.cookie('usertoken', token, {
                ...cookieConfig,
                maxAge: 24 * 60 * 60 * 1000
            });
            // Xóa admintoken nếu lỡ có
            res.clearCookie('admintoken', cookieConfig);
        }

        const roleKey = user.role === 'admin' ? 'admin' : 'customer';
        res.json({
            success: true,
            message: "Đăng nhập thành công",
            role: user.role,
            [roleKey]: {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
};

// -----------------------------------------------------------
// 3. GET ME
// -----------------------------------------------------------
exports.getMe = async (req, res) => {
    try {
        const userId = req.user ? req.user.user_id : null;
        if (!userId) return res.status(401).json({ success: false, message: "Chưa xác thực" });

        const [users] = await db.query(
            'SELECT user_id, username, full_name, phone, address, email, role, points FROM users WHERE user_id = ?',
            [userId]
        );
        if (users.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        res.json({ success: true, user: users[0] });
    } catch (err) {
        console.error("GetMe Error:", err);
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
};

// -----------------------------------------------------------
// 4. LOGOUT
// -----------------------------------------------------------
exports.logout = (req, res) => {
    const cookieConfig = getCookieConfig(req);
    
    // Xóa cả 2 cho chắc ăn nhưng vẫn theo đúng domain config
    res.clearCookie('usertoken', cookieConfig);
    res.clearCookie('admintoken', cookieConfig);

    res.json({ success: true, message: "Đăng xuất thành công" });
};
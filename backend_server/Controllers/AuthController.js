const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// --- CẤU HÌNH COOKIE CHUNG ---
// Xóa bỏ thuộc tính domain ở đây để trình duyệt tự gán vào host gọi API
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,    // Bắt buộc trên Render
    sameSite: 'none', // Bắt buộc cho cross-domain (id.vn -> render.com)
    path: '/'
};

// -----------------------------------------------------------
// 1. ĐĂNG KÝ (GIỮ NGUYÊN)
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
        const [result] = await db.query(
            `INSERT INTO users (username, full_name, phone, address, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, full_name, phone, address || '', email, hashedPassword, role || 'customer']
        );
        res.status(201).json({ message: "Đăng ký thành công", userId: result.insertId });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// -----------------------------------------------------------
// 2. LOGIN (KHÔNG DÙNG THUỘC TÍNH DOMAIN)
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

        const isAdmin = user.role === 'admin';

        // 🔥 XỬ LÝ COOKIE: Bỏ tham số domain để trình duyệt tự quản lý theo Host
        if (isAdmin) {
            // Xóa sạch usertoken (nếu có)
            res.clearCookie('usertoken', BASE_COOKIE_CONFIG);
            // Cấp admintoken
            res.cookie('admintoken', token, {
                ...BASE_COOKIE_CONFIG,
                maxAge: 24 * 60 * 60 * 1000
            });
        } else {
            // Xóa sạch admintoken (nếu có)
            res.clearCookie('admintoken', BASE_COOKIE_CONFIG);
            // Cấp usertoken
            res.cookie('usertoken', token, {
                ...BASE_COOKIE_CONFIG,
                maxAge: 24 * 60 * 60 * 1000
            });
        }

        const roleKey = isAdmin ? 'admin' : 'customer';
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
// 3. GET ME (GIỮ NGUYÊN)
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
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
};

// -----------------------------------------------------------
// 4. LOGOUT (QUÉT SẠCH KHÔNG CẦN DOMAIN)
// -----------------------------------------------------------
exports.logout = (req, res) => {
    res.clearCookie('usertoken', BASE_COOKIE_CONFIG);
    res.clearCookie('admintoken', BASE_COOKIE_CONFIG);
    res.json({ success: true, message: "Đăng xuất thành công" });
};
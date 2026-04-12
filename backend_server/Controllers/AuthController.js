const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// --- CẤU HÌNH COOKIE CHUNG (TÁCH BIỆT RÕ RÀNG) ---
const BASE_COOKIE_CONFIG = {
    httpOnly: true,
    secure: true, // Bắt buộc cho https (Render/Vercel)
    sameSite: 'none', // Bắt buộc để gửi cookie cross-site
    path: '/'
};

// -----------------------------------------------------------
// 1. XỬ LÝ ĐĂNG KÝ
// -----------------------------------------------------------
exports.register = async (req, res) => {
    const { username, full_name, phone, address, email, password, role } = req.body;

    try {
        if (!full_name || full_name.length < 8) {
            return res.status(400).json({ field: 'full_name', message: "Họ tên phải từ 8 ký tự trở lên" });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                field: 'password', 
                message: "Mật khẩu yếu! Cần chữ hoa, thường, số và ký tự đặc biệt" 
            });
        }

        const [existing] = await db.query(
            'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ?', 
            [username, email, phone]
        );
        if (existing.length > 0) {
            const user = existing[0];
            const field = user.username === username ? 'username' : (user.email === email ? 'email' : 'phone');
            return res.status(400).json({ field, message: `${field} đã tồn tại` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const finalRole = role || 'customer';

        const sql = `INSERT INTO users (username, full_name, phone, address, email, password, role) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [username, full_name, phone, address || '', email, hashedPassword, finalRole];

        const [result] = await db.query(sql, params);
        res.status(201).json({ message: "Đăng ký thành công", userId: result.insertId });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi đăng ký" });
    }
};

// -----------------------------------------------------------
// 2. XỬ LÝ ĐĂNG NHẬP (TÁCH BIỆT LOGIC TOKEN)
// -----------------------------------------------------------
exports.login = async (req, res) => {
    const { email, password, role_input } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: "Thông tin không chính xác" });

        const user = users[0];
        
        if (role_input && user.role !== role_input) {
            return res.status(403).json({ message: "Sai quyền truy cập" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Thông tin không chính xác" });

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        
        // Xác định tên thẻ sẽ cấp
        const cookieName = (user.role === 'admin') ? 'admintoken' : 'usertoken';
        
        // TÁCH BIỆT: Option cho việc CẤP MỚI
        const setOptions = { 
            ...BASE_COOKIE_CONFIG, 
            maxAge: 24 * 60 * 60 * 1000 
        };

        // TÁCH BIỆT: Option cho việc XÓA (Max-Age = 0 để ép xóa ngay)
        const clearOptions = { 
            ...BASE_COOKIE_CONFIG,
            maxAge: 0 
        };

        // Bước 1: Quét sạch cả 2 thẻ cũ để dọn đường
        res.clearCookie('usertoken', clearOptions);
        res.clearCookie('admintoken', clearOptions);
        
        // Bước 2: Cấp thẻ mới đúng vai trò sau khi đã dọn dẹp
        res.cookie(cookieName, token, setOptions);
        
        const isAdmin = user.role === 'admin';
        const roleKey = isAdmin ? 'admin' : 'customer';
        res.json({ 
            message: "Đăng nhập thành công", 
            role: user.role,
            [roleKey]: { 
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                phone: user.phone,
                address: user.address,
                email: user.email,
                points: user.points,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Lỗi đăng nhập" });
    }
};

// -----------------------------------------------------------
// 3. LẤY THÔNG TIN CÁ NHÂN
// -----------------------------------------------------------
exports.getMe = async (req, res) => {
    try {
        const userId = req.user ? req.user.user_id : null;
        if (!userId) return res.status(401).json({ message: "Không tìm thấy thông tin xác thực" });

        const [users] = await db.query(
            'SELECT user_id, username, full_name, phone, address, email, role, points FROM users WHERE user_id = ?', 
            [userId]
        );

        if (users.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        res.json({ user: users[0] }); 
    } catch (err) {
        console.error("GetMe Error:", err);
        res.status(500).json({ error: "Lỗi khi lấy thông tin cá nhân" });
    }
};

// -----------------------------------------------------------
// 4. XỬ LÝ ĐĂNG XUẤT (Dọn dẹp triệt để)
// -----------------------------------------------------------
exports.logout = (req, res) => {
    // Ép trình duyệt xóa bằng cách đặt thời gian hết hạn là 0
    const logoutOptions = {
        ...BASE_COOKIE_CONFIG,
        maxAge: 0
    };

    res.clearCookie('usertoken', logoutOptions);
    res.clearCookie('admintoken', logoutOptions);

    res.json({ message: "Đã đăng xuất hệ thống thành công" });
};
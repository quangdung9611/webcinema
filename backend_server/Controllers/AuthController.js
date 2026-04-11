const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// -----------------------------------------------------------
// 1. XỬ LÝ ĐĂNG KÝ (Giữ nguyên logic ban đầu của Dũng)
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
// 2. XỬ LÝ ĐĂNG NHẬP (Cập nhật Path để dùng song song & bảo mật)
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
        
        // NHẬN DIỆN LÀN ĐƯỜNG: Dựa vào URL gọi API để quyết định loại Cookie
        const isApiAdmin = req.originalUrl.includes('/admin');
        const cookieName = isApiAdmin ? 'admintoken' : 'usertoken';
        
        // THIẾT LẬP COOKIE:
        // - Admin: path là /api (Tàng hình trên giao diện, chỉ hiện khi gọi API)
        // - User: path là / (Dùng cho toàn bộ website)
        const cookieOptions = { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'none', 
            path: isApiAdmin ? '/api' : '/', 
            maxAge: 24*60*60*1000 
        };
        
        res.cookie(cookieName, token, cookieOptions);
        
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
// 3. LẤY THÔNG TIN CÁ NHÂN (Giữ nguyên)
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
// 4. XỬ LÝ ĐĂNG XUẤT (Xóa đúng từng Path để không bị kẹt token)
// -----------------------------------------------------------
exports.logout = (req, res) => {
    const commonOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    };

    // Xóa usertoken ở path /
    res.clearCookie('usertoken', { ...commonOptions, path: '/' });

    // Xóa admintoken ở path /api
    res.clearCookie('admintoken', { ...commonOptions, path: '/api' });

    res.json({ message: "Đã đăng xuất hệ thống" });
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Config/db');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// -----------------------------------------------------------
// 1. XỬ LÝ ĐĂNG KÝ
// -----------------------------------------------------------
exports.register = async (req, res) => {
    const { username, full_name, email, password, phone, role } = req.body;

    try {
        if (!full_name || full_name.length < 8) {
            return res.status(400).json({ field: 'full_name', message: "Họ tên phải từ 8 ký tự trở lên" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                field: 'password', 
                message: "Mật khẩu từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt" 
            });
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ field: 'phone', message: "Số điện thoại phải đúng 10 chữ số" });
        }

        const [existingUser] = await db.query(
            'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ?', 
            [username, email, phone]
        );

        if (existingUser.length > 0) {
            const user = existingUser[0];
            if (user.username === username) return res.status(400).json({ field: 'username', message: "Tên đăng nhập đã tồn tại" });
            if (user.email === email) return res.status(400).json({ field: 'email', message: "Email này đã tồn tại" });
            if (user.phone === phone) return res.status(400).json({ field: 'phone', message: "Số điện thoại này đã được sử dụng" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const allowedRoles = ['admin', 'customer'];
        const finalRole = allowedRoles.includes(role) ? role : 'customer';

        const [result] = await db.query(
            'INSERT INTO users (username, full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, full_name, email, hashedPassword, phone, finalRole]
        );
        
        res.status(201).json({ 
            message: "Đăng ký thành công", 
            userId: result.insertId,
            role: finalRole 
        });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi đăng ký" });
    }
};

// -----------------------------------------------------------
// 2. XỬ LÝ ĐĂNG NHẬP (Đã sửa lỗi SameSite & Secure cho Render)
// -----------------------------------------------------------
exports.login = async (req, res) => {
    const { email, password, role_input } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác" });
        }

        const user = users[0];

        if (role_input && user.role !== role_input) {
            return res.status(403).json({ 
                message: `Tài khoản này không có quyền truy cập trang ${role_input === 'admin' ? 'Quản trị' : 'Người dùng'}` 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác" });
        }

        const token = jwt.sign(
            { id: user.user_id, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '24h' }
        );
        
        const isAdmin = user.role === 'admin';

        // Cấu hình Cookie chuẩn để chạy xuyên Domain (Cross-site)
        const cookieOptions = {
            httpOnly: true,
            secure: true,      // Bắt buộc true vì dùng HTTPS trên Render
            sameSite: 'none',  // Bắt buộc none để gửi cookie từ Render sang .id.vn
            path: '/',         // Để '/' đồng nhất để tránh lỗi không tìm thấy token
            maxAge: 24 * 60 * 60 * 1000 
        };
        
        if (isAdmin) {
            // Cấp admintoken
            res.cookie('admintoken', token, cookieOptions);
            // Xóa dấu vết usertoken nếu có
            res.clearCookie('usertoken', cookieOptions);
        } else {
            // Cấp usertoken
            res.cookie('usertoken', token, cookieOptions);
            // Xóa dấu vết admintoken nếu có
            res.clearCookie('admintoken', cookieOptions);
        }

        const roleKey = isAdmin ? 'admin' : 'customer';
        
        res.json({ 
            message: "Đăng nhập thành công", 
            role: user.role,
            [roleKey]: { 
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi đăng nhập" });
    }
};

// -----------------------------------------------------------
// 3. LẤY THÔNG TIN CÁ NHÂN
// -----------------------------------------------------------
exports.getMe = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.status(401).json({ message: "Không tìm thấy thông tin xác thực" });
        }

        const [users] = await db.query(
            'SELECT user_id, username, full_name, email, phone, role, points FROM users WHERE user_id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        res.json({ user: users[0] }); 

    } catch (err) {
        console.error("GetMe Error:", err);
        res.status(500).json({ error: "Lỗi khi lấy thông tin cá nhân" });
    }
};

// -----------------------------------------------------------
// 4. XỬ LÝ ĐĂNG XUẤT
// -----------------------------------------------------------
exports.logout = (req, res) => {
    // Khi xóa cookie cũng phải truyền đúng options giống như lúc set
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
    };

    res.clearCookie('usertoken', cookieOptions);
    res.clearCookie('admintoken', cookieOptions);
    res.json({ message: "Đã đăng xuất hệ thống" });
};
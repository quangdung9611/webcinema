const bcrypt = require('bcryptjs');
const db = require('../Config/db');

/**
 * ==========================================
 * HÀM HỖ TRỢ (HELPER FUNCTIONS)
 * ==========================================
 */

// Hàm kiểm tra định dạng dữ liệu đầu vào (Validation)
const validateUserData = (data, isUpdate = false) => {
    const { username, full_name, email, password, phone,address,role } = data;

    // 1. Kiểm tra các trường bắt buộc khi thêm mới
    if (!isUpdate && (!username || !full_name || !email || !password || !phone)) {
        return { error: "Vui lòng nhập đầy đủ thông tin bắt buộc" };
    }

    // 2. Kiểm tra độ dài họ tên (> 8 ký tự)
    if (full_name && full_name.length < 8) {
        return { field: 'full_name', error: "Họ tên phải từ 8 ký tự trở lên" };
    }

    // 3. Kiểm tra định dạng số điện thoại (10 số)
    if (phone && !/^[0-9]{10}$/.test(phone)) {
        return { field: 'phone', error: "Số điện thoại phải đúng 10 chữ số" };
    }

    // 4. Kiểm tra độ mạnh mật khẩu (Chỉ kiểm tra nếu có nhập password)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (password && !passwordRegex.test(password)) {
        return { 
            field: 'password', 
            error: "Mật khẩu yếu! Cần ít nhất 8 ký tự, bao gồm chữ hoa, thường, số và ký tự đặc biệt" 
        };
    }
    // 5. Kiểm tra địa chỉ (Bổ sung phần Quang Dũng nhắc)
    if (address !== undefined && address.trim().length < 5) {
        return { field: 'address', error: "Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn" };
    }

    // 6. Kiểm tra vai trò
    if (role && !['admin', 'customer'].includes(role)) {
        return { field: 'role', error: "Vai trò không hợp lệ" };
    }
    return null; // Trả về null nếu mọi thứ hợp lệ
};

/**
 * ==========================================
 * CÁC HÀM XỬ LÝ CHÍNH (CONTROLLERS)
 * ==========================================
 */

// 1. Lấy danh sách tất cả người dùng (Hiển thị đầy đủ address và role trên bảng Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT user_id, username, full_name, email, phone, role, address, points FROM users ORDER BY user_id DESC'
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Get All Users Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách người dùng" });
    }
};

// 2. Thêm mới người dùng
exports.createUser = async (req, res) => {
    try {
        const { username, full_name, email, password, phone, role, address } = req.body;

        const validationError = validateUserData(req.body);
        if (validationError) return res.status(400).json(validationError);

        // Kiểm tra trùng lặp
        const [existing] = await db.query(
            'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ?',
            [username, email, phone]
        );

        if (existing.length > 0) {
            const user = existing[0];
            const field = user.username === username ? 'username' : (user.email === email ? 'email' : 'phone');
            return res.status(400).json({ field, error: `${field} này đã tồn tại trong hệ thống` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Mặc định là customer nếu không chọn role
        const finalRole = role || 'customer';

        const sql = `INSERT INTO users (username, full_name, email, password, phone, role, address) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.query(sql, [username, full_name, email, hashedPassword, phone, finalRole, address || null]);

        res.status(201).json({ 
            message: "Thêm người dùng thành công", 
            user_id: result.insertId 
        });

    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi tạo người dùng" });
    }
};

// 3. Cập nhật thông tin người dùng (Quan trọng cho Form Admin)
exports.updateUser = async (req, res) => {
    const { user_id } = req.params;
    const { full_name, phone, email, role, address, password } = req.body;

    try {
        const validationError = validateUserData(req.body, true);
        if (validationError) return res.status(400).json(validationError);

        // Câu lệnh SQL động
        let sql = `UPDATE users SET full_name = ?, phone = ?, email = ?, role = ?, address = ?`;
        let params = [full_name, phone, email, role, address];

        // Xử lý đổi mật khẩu: Nếu field password gửi lên có giá trị thì mới cập nhật
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += `, password = ?`;
            params.push(hashedPassword);
        }

        sql += ` WHERE user_id = ?`;
        params.push(user_id);

        const [result] = await db.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng để cập nhật" });
        }
        
        res.status(200).json({ message: "Cập nhật thông tin thành công!" });

    } catch (err) {
        console.error("Update User Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Email hoặc Số điện thoại đã được người khác sử dụng" });
        }
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật" });
    }
};

// 4. Xóa người dùng
exports.deleteUser = async (req, res) => {
    const { user_id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [user_id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        
        res.status(200).json({ message: "Đã xóa người dùng thành công" });
    } catch (err) {
        console.error("Delete User Error:", err);
        res.status(500).json({ error: "Không thể xóa (Người dùng có dữ liệu liên quan)" });
    }
};
// Lấy thông tin cá nhân dựa trên user_id từ Token
exports.getUserProfile = async (req, res) => {
    // Lưu ý: user_id này lấy từ middleware xác thực (req.user)
    const userId = req.user.user_id; 

    try {
        const [rows] = await db.query(
            'SELECT user_id, username, full_name, email, phone, address, role, points FROM users WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy thông tin cá nhân" });
    }
};
// 6. Người dùng tự cập nhật thông tin
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.user_id;
    const { full_name, phone, email, address, oldPassword, newPassword } = req.body;

    try {
        const validationError = validateUserData({ 
            full_name, 
            phone, 
            email, 
            address, 
            password: newPassword 
        }, true);
        
        if (validationError) return res.status(400).json(validationError);

        let hashedPassword = null;
        if (newPassword && newPassword.trim() !== "") {
            if (!oldPassword) {
                return res.status(400).json({ field: 'oldPassword', error: "Vui lòng nhập mật khẩu cũ" });
            }

            const [rows] = await db.query('SELECT password FROM users WHERE user_id = ?', [userId]);
            const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
            
            if (!isMatch) {
                return res.status(400).json({ field: 'oldPassword', error: "Mật khẩu cũ không đúng" });
            }
            hashedPassword = await bcrypt.hash(newPassword, 10);
        }

        let fields = ["full_name = ?", "phone = ?", "email = ?", "address = ?"];
        let params = [full_name, phone, email, address];

        if (hashedPassword) {
            fields.push("password = ?");
            params.push(hashedPassword);
        }

        params.push(userId);
        const sql = `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`;
        await db.query(sql, params);

        // Lấy lại dữ liệu mới nhất để trả về Frontend
        const [updatedUser] = await db.query(
            'SELECT user_id, username, full_name, email, phone, address, role, points FROM users WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({ 
            message: "Cập nhật thành công!",
            user: updatedUser[0] 
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi máy chủ: " + err.message });
    }
};

// 7. Lấy lịch sử giao dịch (Khớp chính xác database cinema_shop)
exports.getBookingHistory = async (req, res) => {
    const userId = req.user.user_id;

    const sql = `
        SELECT 
            b.booking_id AS bookingId,
            m.title AS movieTitle,
            m.poster_url AS moviePoster,
            c.cinema_name AS cinemaName,
            r.room_name AS roomName,
            DATE_FORMAT(s.start_time, '%d/%m/%Y') AS selectedDate,
            TIME_FORMAT(s.start_time, '%H:%i') AS startTime,
            GROUP_CONCAT(bd.item_name SEPARATOR ', ') AS seatDisplay,
            b.total_amount AS total_amount,
            b.status,
            b.memo AS ticketPIN
        FROM bookings b
        JOIN showtimes s ON b.showtime_id = s.showtime_id
        JOIN movies m ON s.movie_id = m.movie_id
        JOIN rooms r ON s.room_id = r.room_id
        JOIN cinemas c ON s.cinema_id = c.cinema_id
        LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
        WHERE b.user_id = ?
        GROUP BY b.booking_id
        ORDER BY b.booking_date DESC
    `;

    try {
        const [rows] = await db.query(sql, [userId]);
        res.status(200).json({ bookings: rows });
    } catch (error) {
        console.error("Booking History Error:", error);
        res.status(500).json({ error: "Lỗi khi lấy lịch sử giao dịch" });
    }
};
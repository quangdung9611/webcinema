const db = require('../Config/db');

/**
 * HÀM HỖ TRỢ: Kiểm tra dữ liệu Phòng
 */
const validateRoomData = (data) => {
    const { room_name, cinema_id, room_type } = data;
    if (!room_name || !cinema_id || !room_type) {
        return { error: "Vui lòng nhập tên phòng, chọn cụm rạp và loại phòng" };
    }
    if (room_name.trim().length < 2) {
        return { field: 'room_name', error: "Tên phòng quá ngắn" };
    }
    return null;
};

// 1. Lấy tất cả phòng (Hiển thị ngày tạo định dạng VN)
exports.getAllRooms = async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.room_id, 
                r.room_name, 
                r.room_type,
                DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
                c.cinema_name, 
                c.city 
            FROM rooms r
            JOIN cinemas c ON r.cinema_id = c.cinema_id
            ORDER BY r.room_id DESC
        `;
        
        const [rows] = await db.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lấy danh sách phòng:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách phòng từ database" });
    }
};

// 2. Lấy chi tiết 1 phòng
exports.getRoomById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE room_id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy phòng" });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy chi tiết phòng" });
    }
};

// 3. Lấy danh sách phòng theo Cinema ID
exports.getRoomsByCinema = async (req, res) => {
    const { cinema_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE cinema_id = ?', [cinema_id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lọc phòng theo rạp" });
    }
};

// 4. Thêm phòng mới (Bổ sung created_at chuẩn VN)
exports.createRoom = async (req, res) => {
    try {
        const { room_name, cinema_id, room_type } = req.body;
        const validationError = validateRoomData(req.body);
        if (validationError) return res.status(400).json(validationError);

        // Kiểm tra trùng tên phòng
        const [existing] = await db.query(
            'SELECT * FROM rooms WHERE room_name = ? AND cinema_id = ?',
            [room_name, cinema_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                field: 'room_name', 
                error: "Tên phòng này đã tồn tại trong rạp này rồi" 
            });
        }

        // --- ÉP GIỜ VIỆT NAM ---
        const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        const [result] = await db.query(
            'INSERT INTO rooms (room_name, cinema_id, room_type, created_at) VALUES (?, ?, ?, ?)',
            [room_name.trim(), cinema_id, room_type, nowVN]
        );

        res.status(201).json({ 
            success: true,
            message: "Thêm phòng thành công", 
            room_id: result.insertId 
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi hệ thống khi tạo phòng: " + err.message });
    }
};

// 5. Cập nhật phòng
exports.updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_name, cinema_id, room_type } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE rooms SET room_name = ?, cinema_id = ?, room_type = ? WHERE room_id = ?',
            [room_name, cinema_id, room_type, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy phòng" });
        res.status(200).json({ message: "Cập nhật phòng thành công" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi cập nhật phòng: " + err.message });
    }
};

// 6. Xóa phòng
exports.deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM rooms WHERE room_id = ?', [id]);
        res.status(200).json({ message: "Đã xóa phòng thành công" });
    } catch (err) {
        res.status(500).json({ error: "Không thể xóa (Phòng có dữ liệu ghế hoặc suất chiếu)" });
    }
};
const db = require('../Config/db');

/**
 * ==========================================
 * HÀM HỖ TRỢ (HELPER FUNCTIONS)
 * ==========================================
 */
const validateShowtimeData = (data) => {
    const { movie_id, cinema_id, room_id, start_time } = data;

    if (!movie_id || !cinema_id || !room_id || !start_time) {
        return { error: "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu" };
    }

    // start_time từ client gửi lên là chuỗi "YYYY-MM-DD HH:mm"
    // So sánh chuỗi trực tiếp với thời gian hiện tại (định dạng sv-SE tương đồng ISO nhưng là giờ VN)
    const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace('T', ' ');
    
    if (start_time < now) {
        return { field: 'start_time', error: "Dũng ơi, không thể tạo suất chiếu ở quá khứ được!" };
    }

    return null;
};

/**
 * ==========================================
 * CÁC HÀM XỬ LÝ CHÍNH (CONTROLLERS)
 * ==========================================
 */

// 1. Lấy tất cả suất chiếu (Dùng DATE_FORMAT để khóa giờ khi lấy ra)
exports.getAllShowtimes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id, 
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time, 
                m.title, 
                m.duration,
                c.cinema_name, 
                r.room_name, 
                r.room_type
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            JOIN rooms r ON s.room_id = r.room_id
            ORDER BY s.start_time DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lấy DS suất chiếu:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách suất chiếu" });
    }
};

// 2. Lấy chi tiết một suất chiếu
exports.getShowtimeDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id,
                s.movie_id,
                s.cinema_id,
                s.room_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time,
                m.title, 
                m.poster_url, 
                m.age_rating,
                r.room_name, 
                r.room_type,
                c.cinema_name
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            WHERE s.showtime_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy suất chiếu" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lấy chi tiết suất chiếu:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// 3. Thêm mới suất chiếu (Dùng STR_TO_DATE để khóa giờ khi lưu vào)
exports.createShowtime = async (req, res) => {
    try {
        const { movie_id, cinema_id, room_id, start_time } = req.body;

        const validationError = validateShowtimeData(req.body);
        if (validationError) return res.status(400).json(validationError);

        // Kiểm tra trùng lịch: Ép kiểu chuỗi để so sánh chính xác tuyệt đối
        const [conflict] = await db.query(
            "SELECT * FROM showtimes WHERE room_id = ? AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ?",
            [room_id, start_time]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ 
                field: 'start_time', 
                error: "Dũng ơi, phòng này giờ đó có phim khác rồi!" 
            });
        }

        // Dùng STR_TO_DATE để MySQL tự bốc chuỗi String vào, né thằng Node.js tự đổi múi giờ
        const sql = `INSERT INTO showtimes (movie_id, cinema_id, room_id, start_time) VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i'))`;
        const [result] = await db.query(sql, [movie_id, cinema_id, room_id, start_time]);

        res.status(201).json({ 
            message: "Thêm suất chiếu thành công", 
            showtime_id: result.insertId 
        });

    } catch (err) {
        console.error("❌ [DŨNG] Lỗi tạo suất chiếu:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// 4. Cập nhật suất chiếu
exports.updateShowtime = async (req, res) => {
    const { id } = req.params;
    const { movie_id, cinema_id, room_id, start_time } = req.body;

    try {
        const validationError = validateShowtimeData(req.body);
        if (validationError) return res.status(400).json(validationError);

        const [conflict] = await db.query(
            "SELECT * FROM showtimes WHERE room_id = ? AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ? AND showtime_id != ?",
            [room_id, start_time, id]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ 
                field: 'start_time', 
                error: "Trùng lịch rồi, hãy chọn giờ khác cho phòng này!" 
            });
        }

        const sql = `UPDATE showtimes SET movie_id = ?, cinema_id = ?, room_id = ?, start_time = STR_TO_DATE(?, '%Y-%m-%d %H:%i') WHERE showtime_id = ?`;
        await db.query(sql, [movie_id, cinema_id, room_id, start_time, id]);
        
        res.status(200).json({ message: "Cập nhật suất chiếu thành công!" });

    } catch (err) {
        console.error("❌ [DŨNG] Lỗi cập nhật suất chiếu:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// 6. Lấy suất chiếu theo phim
exports.getShowtimesByMovie = async (req, res) => {
    try {
        const { movieId } = req.params;
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id, 
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time, 
                r.room_name, 
                r.room_type,
                c.cinema_name
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ?
            ORDER BY s.start_time ASC
        `, [movieId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lấy lịch theo phim:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

exports.deleteShowtime = async (req, res) => {
    const { id } = req.params;
    try {
        const [tickets] = await db.query('SELECT * FROM tickets WHERE showtime_id = ?', [id]);
        if (tickets.length > 0) {
            return res.status(400).json({ 
                error: "Dũng ơi, vé đã bán rồi thì không được xóa suất chiếu đâu nha!" 
            });
        }

        const [result] = await db.query('DELETE FROM showtimes WHERE showtime_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy" });
        
        res.status(200).json({ message: "Đã xóa suất chiếu thành công" });
    } catch (err) {
        console.error("❌ [DŨNG] Lỗi xóa suất chiếu:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};
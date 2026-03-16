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

    const selectedTime = new Date(start_time);
    if (selectedTime < new Date()) {
        return { field: 'start_time', error: "Thời gian chiếu không được ở trong quá khứ" };
    }

    return null;
};

/**
 * ==========================================
 * CÁC HÀM XỬ LÝ CHÍNH (CONTROLLERS)
 * ==========================================
 */

// 1. Lấy tất cả suất chiếu
// MovieShowtimeController.js
exports.getAllShowtimes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id, 
                s.start_time, 
                m.title,         -- Sửa 'm.title as movie_title' thành 'm.title' để khớp s.title ở React
                m.duration,      -- Bổ sung thêm duration để hiện số phút phim
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
        console.error("Get All Showtimes Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách suất chiếu" });
    }
};
// 2. Lấy chi tiết một suất chiếu (Đã JOIN để lấy room_type và title)
exports.getShowtimeDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                s.*, 
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
            return res.status(404).json({ error: "Không tìm thấy thông tin suất chiếu này" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Get Detail Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy chi tiết" });
    }
};

// 3. Thêm mới suất chiếu
exports.createShowtime = async (req, res) => {
    try {
        const { movie_id, cinema_id, room_id, start_time } = req.body;

        const validationError = validateShowtimeData(req.body);
        if (validationError) return res.status(400).json(validationError);

        const [conflict] = await db.query(
            'SELECT * FROM showtimes WHERE room_id = ? AND start_time = ?',
            [room_id, start_time]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ 
                field: 'start_time', 
                error: "Phòng này đã có lịch chiếu khác vào thời gian bạn chọn" 
            });
        }

        const sql = `INSERT INTO showtimes (movie_id, cinema_id, room_id, start_time) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(sql, [movie_id, cinema_id, room_id, start_time]);

        res.status(201).json({ 
            message: "Thêm suất chiếu thành công", 
            showtime_id: result.insertId 
        });

    } catch (err) {
        console.error("Create Showtime Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi tạo suất chiếu" });
    }
};

// 4. Cập nhật suất chiếu
exports.updateShowtime = async (req, res) => {
    const { id } = req.params;
    const { movie_id, cinema_id, room_id, start_time } = req.body;

    try {
        const validationError = validateShowtimeData(req.body);
        if (validationError) return res.status(400).json(validationError);

        const [current] = await db.query('SELECT * FROM showtimes WHERE showtime_id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy suất chiếu để cập nhật" });
        }

        const [conflict] = await db.query(
            'SELECT * FROM showtimes WHERE room_id = ? AND start_time = ? AND showtime_id != ?',
            [room_id, start_time, id]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ 
                field: 'start_time', 
                error: "Trùng lịch! Phòng đã có suất chiếu khác vào thời điểm này" 
            });
        }

        const sql = `UPDATE showtimes SET movie_id = ?, cinema_id = ?, room_id = ?, start_time = ? WHERE showtime_id = ?`;
        await db.query(sql, [movie_id, cinema_id, room_id, start_time, id]);
        
        res.status(200).json({ message: "Cập nhật suất chiếu thành công!" });

    } catch (err) {
        console.error("Update Showtime Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật" });
    }
};

// 5. Xóa suất chiếu
exports.deleteShowtime = async (req, res) => {
    const { id } = req.params;
    try {
        const [tickets] = await db.query('SELECT * FROM tickets WHERE showtime_id = ?', [id]);
        if (tickets.length > 0) {
            return res.status(400).json({ 
                error: "Không thể xóa vì suất chiếu này đã có khách hàng đặt vé!" 
            });
        }

        const [result] = await db.query('DELETE FROM showtimes WHERE showtime_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy" });
        
        res.status(200).json({ message: "Đã xóa suất chiếu thành công" });
    } catch (err) {
        console.error("Delete Showtime Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi xóa suất chiếu" });
    }
};

// 6. BỔ SUNG: Lấy suất chiếu theo phim (Khắc phục lỗi dòng 33 Router)
exports.getShowtimesByMovie = async (req, res) => {
    try {
        const { movieId } = req.params;
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id, s.start_time, 
                r.room_name, r.room_type,
                c.cinema_name
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ?
            ORDER BY s.start_time ASC
        `, [movieId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Get Showtimes By Movie Error:", error);
        res.status(500).json({ error: "Lỗi lấy lịch chiếu theo phim" });
    }
};
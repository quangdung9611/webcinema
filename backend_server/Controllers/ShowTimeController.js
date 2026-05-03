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

    // Lấy thời gian hiện tại chuẩn VN (YYYY-MM-DD HH:mm)
    const now = new Date().toLocaleString("sv-SE", { 
        timeZone: "Asia/Ho_Chi_Minh" 
    }).replace('T', ' ').substring(0, 16); 
    
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

// 1. Lấy tất cả suất chiếu
exports.getAllShowtimes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.showtime_id, 
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') as start_time, 
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
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') as start_time,
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

// 3. Thêm mới suất chiếu
exports.createShowtime = async (req, res) => {
    try {
        let { movie_id, cinema_id, room_id, start_time } = req.body;

        // XỬ LÝ TRIỆT ĐỂ: Bỏ chữ T và chuẩn hóa định dạng YYYY-MM-DD HH:mm
        if (start_time && start_time.includes('T')) {
            start_time = start_time.replace('T', ' ').substring(0, 16);
        }

        // Ép kiểu ID về số để tránh lỗi Database (nếu cần)
        const movieIdx = Number(movie_id);
        const cinemaIdx = Number(cinema_id);
        const roomIdx = Number(room_id);

        const validationError = validateShowtimeData({ movie_id: movieIdx, cinema_id: cinemaIdx, room_id: roomIdx, start_time });
        if (validationError) return res.status(400).json(validationError);

        // Kiểm tra trùng lịch
        const [conflict] = await db.query(
            "SELECT * FROM showtimes WHERE room_id = ? AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ?",
            [roomIdx, start_time]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ 
                field: 'start_time', 
                error: "Dũng ơi, phòng này giờ đó có phim khác rồi!" 
            });
        }

        const sql = `INSERT INTO showtimes (movie_id, cinema_id, room_id, start_time) VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i'))`;
        const [result] = await db.query(sql, [movieIdx, cinemaIdx, roomIdx, start_time]);

        console.log(`✅ [Success] Đã thêm suất chiếu mới: ${start_time}`);

        res.status(201).json({ 
            message: "Thêm suất chiếu thành công", 
            showtime_id: result.insertId 
        });

    } catch (err) {
        console.error("❌ [DŨNG] Lỗi tạo suất chiếu:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống khi thêm suất chiếu" });
    }
};

// 4. Cập nhật suất chiếu
exports.updateShowtime = async (req, res) => {
    const { id } = req.params;
    let { movie_id, cinema_id, room_id, start_time } = req.body;

    try {
        // Bỏ chữ T
        if (start_time && start_time.includes('T')) {
            start_time = start_time.replace('T', ' ').substring(0, 16);
        }

        const validationError = validateShowtimeData({ movie_id, cinema_id, room_id, start_time });
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
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật" });
    }
};

// 5. Lấy suất chiếu theo phim (Dành cho trang Movie Detail)
exports.getShowtimesByMovie = async (req, res) => {
    try {
        const { movieId } = req.params;
        // Chỉ lấy những suất chiếu chưa diễn ra
        const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

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
            WHERE s.movie_id = ? AND s.start_time >= ?
            ORDER BY s.start_time ASC
        `, [movieId, nowVN]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lấy lịch theo phim:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// 6. Xóa suất chiếu
exports.deleteShowtime = async (req, res) => {
    const { id } = req.params;
    try {
        // Ràng buộc bảo vệ: Suất chiếu đã có vé (bookings/tickets) thì tuyệt đối ko xóa
        const [tickets] = await db.query('SELECT * FROM tickets WHERE showtime_id = ?', [id]);
        if (tickets.length > 0) {
            return res.status(400).json({ 
                error: "Dũng ơi, vé đã bán rồi thì không được xóa suất chiếu đâu nha! Khách kiện chết á." 
            });
        }

        const [result] = await db.query('DELETE FROM showtimes WHERE showtime_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy suất chiếu này" });
        
        res.status(200).json({ message: "Đã xóa suất chiếu thành công" });
    } catch (err) {
        console.error("❌ [DŨNG] Lỗi xóa suất chiếu:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống khi xóa" });
    }
};
exports.filterShowtimes = async (req, res) => {
    try {
        const { movie_id, room_id, date } = req.query;

        if (!movie_id || !room_id || !date) {
            return res.status(400).json({ error: "Thiếu dữ liệu lọc rồi Dũng ơi!" });
        }

        // Đảm bảo MySQL hiểu đúng múi giờ Việt Nam trước khi query
        await db.query("SET time_zone = '+07:00'");

        const [rows] = await db.query(`
            SELECT 
                showtime_id, 
                DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') as start_time, 
                room_id
            FROM showtimes 
            WHERE movie_id = ? 
              AND room_id = ? 
              AND DATE(start_time) = ?
            ORDER BY start_time ASC
        `, [movie_id, room_id, date]);

        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ [DŨNG] Lỗi lọc suất chiếu:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};
exports.getQuickBookingData = async (req, res) => {
    try {
        const { movie_id, cinema_id, date } = req.query;

        // ✅ LẤY GIỜ VIỆT NAM CHUẨN
        const nowVN = new Date().toLocaleString("sv-SE", {
            timeZone: "Asia/Ho_Chi_Minh"
        }).replace('T', ' ');

        // --- CASE 0: LOAD DANH SÁCH PHIM ---
        if (!movie_id && !cinema_id && !date) {
            const [movies] = await db.query(`
                SELECT DISTINCT m.movie_id, m.title 
                FROM showtimes s
                JOIN movies m ON s.movie_id = m.movie_id
                WHERE s.start_time >= ?
            `, [nowVN]);

            return res.status(200).json(movies);
        }

        // --- CASE 1: LOAD RẠP ---
        if (movie_id && !cinema_id && !date) {
            const [cinemas] = await db.query(`
                SELECT DISTINCT c.cinema_id, c.cinema_name 
                FROM showtimes s
                JOIN cinemas c ON s.cinema_id = c.cinema_id
                WHERE s.movie_id = ? AND s.start_time >= ?
            `, [movie_id, nowVN]);

            return res.status(200).json(cinemas);
        }

        // --- CASE 2: LOAD NGÀY ---
        if (movie_id && cinema_id && !date) {
            const [dates] = await db.query(`
                SELECT DISTINCT DATE_FORMAT(start_time, '%Y-%m-%d') as show_date
                FROM showtimes 
                WHERE movie_id = ? 
                  AND cinema_id = ? 
                  AND start_time >= ?
                ORDER BY show_date ASC
            `, [movie_id, cinema_id, nowVN]);

            return res.status(200).json(dates);
        }

        // --- CASE 3: LOAD SUẤT ---
        if (movie_id && cinema_id && date) {
            const [times] = await db.query(`
                SELECT 
                    s.showtime_id, 
                    DATE_FORMAT(s.start_time, '%H:%i') as start_time,
                    r.room_name
                FROM showtimes s
                JOIN rooms r ON s.room_id = r.room_id
                WHERE s.movie_id = ? 
                  AND s.cinema_id = ? 
                  AND DATE(s.start_time) = ?
                  AND s.start_time >= ?
                ORDER BY s.start_time ASC
            `, [movie_id, cinema_id, date, nowVN]);

            return res.status(200).json(times);
        }

        return res.status(200).json([]);

    } catch (error) {
        console.error("❌ [DŨNG] Lỗi quick booking:", error.message);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};
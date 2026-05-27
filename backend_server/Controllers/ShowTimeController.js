const db = require('../Config/db');

/**
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

// Chuẩn hóa thời gian YYYY-MM-DD HH:mm
const formatDateTime = (dateTime) => {
    if (!dateTime) return null;

    return dateTime
        .replace('T', ' ')
        .substring(0, 16);
};

// Lấy giờ Việt Nam hiện tại
const getCurrentVNTime = () => {
    return new Date()
        .toLocaleString("sv-SE", {
            timeZone: "Asia/Ho_Chi_Minh"
        })
        .replace('T', ' ')
        .substring(0, 16);
};

// Validate dữ liệu
const validateShowtimeData = (data) => {

    const {
        movie_id,
        cinema_id,
        room_id,
        start_time
    } = data;

    if (
        !movie_id ||
        !cinema_id ||
        !room_id ||
        !start_time
    ) {
        return {
            error: "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu"
        };
    }

    const now = getCurrentVNTime();

    if (start_time < now) {
        return {
            field: 'start_time',
            error: "Dũng ơi, không thể tạo suất chiếu ở quá khứ được!"
        };
    }

    return null;
};

// Kiểm tra trùng lịch chiếu
const checkShowtimeConflict = async (
    room_id,
    start_time,
    excludeId = null
) => {

    let sql = `
        SELECT showtime_id
        FROM showtimes
        WHERE room_id = ?
        AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ?
    `;

    const params = [room_id, start_time];

    // UPDATE -> bỏ qua chính nó
    if (excludeId) {
        sql += ` AND showtime_id != ?`;
        params.push(excludeId);
    }

    const [rows] = await db.query(sql, params);

    return rows.length > 0;
};

/**
 * ==========================================
 * CONTROLLERS
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

        console.error(
            "❌ [DŨNG] Lỗi lấy DS suất chiếu:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống khi lấy danh sách suất chiếu"
        });

    }

};

// 2. Lấy chi tiết suất chiếu
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
                m.slug,
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
            return res.status(404).json({
                error: "Không tìm thấy suất chiếu"
            });
        }

        res.status(200).json(rows[0]);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi lấy chi tiết suất chiếu:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống"
        });

    }

};

// 3. Thêm suất chiếu
exports.createShowtime = async (req, res) => {

    try {

        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = req.body;

        // Chuẩn hóa
        start_time = formatDateTime(start_time);

        // Ép kiểu số
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        // Validate
        const validationError = validateShowtimeData({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });

        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Kiểm tra trùng lịch
        const isConflict = await checkShowtimeConflict(
            room_id,
            start_time
        );

        if (isConflict) {
            return res.status(400).json({
                field: 'start_time',
                error: "Dũng ơi, phòng này giờ đó có phim khác rồi!"
            });
        }

        // Insert
        const sql = `
            INSERT INTO showtimes 
            (
                movie_id,
                cinema_id,
                room_id,
                start_time
            ) 
            VALUES 
            (
                ?, ?, ?, 
                STR_TO_DATE(?, '%Y-%m-%d %H:%i')
            )
        `;

        const [result] = await db.query(sql, [
            movie_id,
            cinema_id,
            room_id,
            start_time
        ]);

        console.log(
            `✅ [SUCCESS] Đã thêm suất chiếu: ${start_time}`
        );

        res.status(201).json({
            message: "Thêm suất chiếu thành công",
            showtime_id: result.insertId
        });

    } catch (err) {

        console.error(
            "❌ [DŨNG] Lỗi tạo suất chiếu:",
            err.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống khi thêm suất chiếu"
        });

    }

};

// 4. Cập nhật suất chiếu
exports.updateShowtime = async (req, res) => {

    const { id } = req.params;

    try {

        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = req.body;

        // Chuẩn hóa
        start_time = formatDateTime(start_time);

        // Ép kiểu
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        // Validate
        const validationError = validateShowtimeData({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });

        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Kiểm tra tồn tại
        const [existing] = await db.query(
            `SELECT showtime_id FROM showtimes WHERE showtime_id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                error: "Không tìm thấy suất chiếu"
            });
        }

        // Kiểm tra trùng lịch
        const isConflict = await checkShowtimeConflict(
            room_id,
            start_time,
            id
        );

        if (isConflict) {
            return res.status(400).json({
                field: 'start_time',
                error: "Trùng lịch rồi, hãy chọn giờ khác cho phòng này!"
            });
        }

        // Update
        const sql = `
            UPDATE showtimes
            SET
                movie_id = ?,
                cinema_id = ?,
                room_id = ?,
                start_time = STR_TO_DATE(?, '%Y-%m-%d %H:%i')
            WHERE showtime_id = ?
        `;

        await db.query(sql, [
            movie_id,
            cinema_id,
            room_id,
            start_time,
            id
        ]);

        res.status(200).json({
            message: "Cập nhật suất chiếu thành công!"
        });

    } catch (err) {

        console.error(
            "❌ [DŨNG] Lỗi cập nhật suất chiếu:",
            err.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống khi cập nhật"
        });

    }

};

// 5. Lấy suất chiếu theo phim
exports.getShowtimesByMovie = async (req, res) => {

    try {

        const { movieId } = req.params;

        const nowVN = getCurrentVNTime();

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
            AND s.start_time >= ?
            ORDER BY s.start_time ASC
        `, [movieId, nowVN]);

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi lấy lịch theo phim:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống"
        });

    }

};

// 6. Xóa suất chiếu
exports.deleteShowtime = async (req, res) => {

    const { id } = req.params;

    try {

        // Check vé
        const [tickets] = await db.query(
            'SELECT * FROM tickets WHERE showtime_id = ?',
            [id]
        );

        if (tickets.length > 0) {
            return res.status(400).json({
                error: "Dũng ơi, vé đã bán rồi thì không được xóa suất chiếu đâu nha!"
            });
        }

        const [result] = await db.query(
            'DELETE FROM showtimes WHERE showtime_id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Không tìm thấy suất chiếu này"
            });
        }

        res.status(200).json({
            message: "Đã xóa suất chiếu thành công"
        });

    } catch (err) {

        console.error(
            "❌ [DŨNG] Lỗi xóa suất chiếu:",
            err.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống khi xóa"
        });

    }

};

// 7. Filter showtimes
exports.filterShowtimes = async (req, res) => {

    try {

        const {
            movie_id,
            room_id,
            date
        } = req.query;

        if (!movie_id || !room_id || !date) {
            return res.status(400).json({
                error: "Thiếu dữ liệu lọc rồi Dũng ơi!"
            });
        }

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
        `, [
            movie_id,
            room_id,
            date
        ]);

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi lọc suất chiếu:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống"
        });

    }

};

// 8. Quick booking
exports.getQuickBookingData = async (req, res) => {

    try {

        const {
            movie_id,
            cinema_id,
            date
        } = req.query;

        const nowVN = getCurrentVNTime();

        // CASE 0: Danh sách phim
        if (!movie_id && !cinema_id && !date) {

            const [movies] = await db.query(`
                SELECT DISTINCT 
                    m.movie_id,
                    m.title
                FROM showtimes s
                JOIN movies m 
                    ON s.movie_id = m.movie_id
                WHERE s.start_time >= ?
            `, [nowVN]);

            return res.status(200).json(movies);

        }

        // CASE 1: Danh sách rạp
        if (movie_id && !cinema_id && !date) {

            const [cinemas] = await db.query(`
                SELECT DISTINCT 
                    c.cinema_id,
                    c.cinema_name
                FROM showtimes s
                JOIN cinemas c 
                    ON s.cinema_id = c.cinema_id
                WHERE s.movie_id = ?
                AND s.start_time >= ?
            `, [movie_id, nowVN]);

            return res.status(200).json(cinemas);

        }

        // CASE 2: Danh sách ngày
        if (movie_id && cinema_id && !date) {

            const [dates] = await db.query(`
                SELECT DISTINCT 
                    DATE_FORMAT(start_time, '%Y-%m-%d') as show_date
                FROM showtimes
                WHERE movie_id = ?
                AND cinema_id = ?
                AND start_time >= ?
                ORDER BY show_date ASC
            `, [
                movie_id,
                cinema_id,
                nowVN
            ]);

            return res.status(200).json(dates);

        }

        // CASE 3: Danh sách suất
        if (movie_id && cinema_id && date) {

            const [times] = await db.query(`
                SELECT 
                    s.showtime_id,
                    DATE_FORMAT(s.start_time, '%H:%i') as start_time,
                    r.room_name
                FROM showtimes s
                JOIN rooms r 
                    ON s.room_id = r.room_id
                WHERE s.movie_id = ?
                AND s.cinema_id = ?
                AND DATE(s.start_time) = ?
                AND s.start_time >= ?
                ORDER BY s.start_time ASC
            `, [
                movie_id,
                cinema_id,
                date,
                nowVN
            ]);

            return res.status(200).json(times);

        }

        return res.status(200).json([]);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi quick booking:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống"
        });

    }

};

// 9. Lấy suất chiếu booking
exports.getShowtimesForBooking = async (req, res) => {

    try {

        const {
            movie_id,
            cinema_id,
            date
        } = req.query;

        if (!movie_id || !cinema_id || !date) {
            return res.status(400).json({
                error: "Dũng ơi, chọn rạp và ngày mới hiện suất chiếu được!"
            });
        }

        const nowVN = getCurrentVNTime();

        const [rows] = await db.query(`
            SELECT 
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') as start_time,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN rooms r 
                ON s.room_id = r.room_id
            WHERE s.movie_id = ?
            AND s.cinema_id = ?
            AND DATE(s.start_time) = ?
            AND s.start_time >= ?
            ORDER BY s.start_time ASC
        `, [
            movie_id,
            cinema_id,
            date,
            nowVN
        ]);

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi lọc suất chiếu Booking:",
            error.message
        );

        res.status(500).json({
            error: "Lỗi hệ thống"
        });

    }

};
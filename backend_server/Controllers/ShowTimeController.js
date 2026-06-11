const db = require('../Config/db');

/**
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

// Chuẩn hóa YYYY-MM-DD HH:mm
const formatDateTime = (dateTime) => {
    if (!dateTime) return null;

    return dateTime
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
            error:
                "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu"
        };
    }

    const now = formatDateTime(
        new Date().toISOString()
    );

    if (start_time < now) {
        return {
            field: 'start_time',
            error:
                "Dũng ơi, không thể tạo suất chiếu ở quá khứ được!"
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
        AND DATE_FORMAT(
            start_time,
            '%Y-%m-%d %H:%i'
        ) = ?
    `;

    const params = [
        room_id,
        start_time
    ];

    if (excludeId) {
        sql += `
            AND showtime_id != ?
        `;
        params.push(excludeId);
    }

    const [rows] =
        await db.query(sql, params);

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

        const [rows] =
            await db.query(`
            SELECT
                s.showtime_id,

                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

                m.title,
                m.duration,

                c.cinema_name,

                r.room_name,
                r.room_type

            FROM showtimes s

            JOIN movies m
                ON s.movie_id = m.movie_id

            JOIN cinemas c
                ON s.cinema_id = c.cinema_id

            JOIN rooms r
                ON s.room_id = r.room_id

            ORDER BY s.start_time DESC
        `);

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            "❌ [DŨNG] Lỗi lấy DS suất chiếu:",
            error.message
        );

        res.status(500).json({
            error:
                "Lỗi hệ thống khi lấy danh sách suất chiếu"
        });

    }
};

// 2. Lấy chi tiết suất chiếu
exports.getShowtimeDetail = async (req, res) => {

    const { id } = req.params;

    try {

        const [rows] =
            await db.query(`
            SELECT
                s.showtime_id,
                s.movie_id,
                s.cinema_id,
                s.room_id,

                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

                m.title,
                m.slug,
                m.poster_url,
                m.age_rating,

                r.room_name,
                r.room_type,

                c.cinema_name

            FROM showtimes s

            JOIN movies m
                ON s.movie_id = m.movie_id

            JOIN rooms r
                ON s.room_id = r.room_id

            JOIN cinemas c
                ON s.cinema_id = c.cinema_id

            WHERE s.showtime_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                error:
                    "Không tìm thấy suất chiếu"
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

        start_time =
            formatDateTime(start_time);

        movie_id =
            Number(movie_id);

        cinema_id =
            Number(cinema_id);

        room_id =
            Number(room_id);

        const validationError =
            validateShowtimeData({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            return res.status(400)
                .json(validationError);
        }

        const isConflict =
            await checkShowtimeConflict(
                room_id,
                start_time
            );

        if (isConflict) {
            return res.status(400).json({
                field: 'start_time',
                error:
                    "Dũng ơi, phòng này giờ đó có phim khác rồi!"
            });
        }

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
                STR_TO_DATE(
                    ?,
                    '%Y-%m-%d %H:%i'
                )
            )
        `;

        const [result] =
            await db.query(sql, [
                movie_id,
                cinema_id,
                room_id,
                start_time
            ]);

        res.status(201).json({
            message:
                "Thêm suất chiếu thành công",
            showtime_id:
                result.insertId
        });

    } catch (err) {

        console.error(
            "❌ [DŨNG] Lỗi tạo suất chiếu:",
            err.message
        );

        res.status(500).json({
            error:
                "Lỗi hệ thống khi thêm suất chiếu"
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

        start_time =
            formatDateTime(start_time);

        movie_id =
            Number(movie_id);

        cinema_id =
            Number(cinema_id);

        room_id =
            Number(room_id);

        const validationError =
            validateShowtimeData({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            return res.status(400)
                .json(validationError);
        }

        const [existing] =
            await db.query(
                `
                SELECT showtime_id
                FROM showtimes
                WHERE showtime_id = ?
                `,
                [id]
            );

        if (existing.length === 0) {
            return res.status(404).json({
                error:
                    "Không tìm thấy suất chiếu"
            });
        }

        const isConflict =
            await checkShowtimeConflict(
                room_id,
                start_time,
                id
            );

        if (isConflict) {
            return res.status(400).json({
                field: 'start_time',
                error:
                    "Trùng lịch rồi, hãy chọn giờ khác cho phòng này!"
            });
        }

        await db.query(`
            UPDATE showtimes
            SET
                movie_id = ?,
                cinema_id = ?,
                room_id = ?,
                start_time =
                    STR_TO_DATE(
                        ?,
                        '%Y-%m-%d %H:%i'
                    )
            WHERE showtime_id = ?
        `, [
            movie_id,
            cinema_id,
            room_id,
            start_time,
            id
        ]);

        res.status(200).json({
            message:
                "Cập nhật suất chiếu thành công!"
        });

    } catch (err) {

        console.error(
            "❌ [DŨNG] Lỗi cập nhật suất chiếu:",
            err.message
        );

        res.status(500).json({
            error:
                "Lỗi hệ thống khi cập nhật"
        });

    }
};
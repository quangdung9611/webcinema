const db = require('../Config/db');

/* =========================================================
    HELPER: SLUG
========================================================= */

const createSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/* =========================================================
    VALIDATE CINEMA
========================================================= */

const validateCinemaData = (data) => {
    const {
        cinema_name,
        address,
        city,
        hotline,
        map_link
    } = data;

    if (!cinema_name || !address || !city || !hotline || !map_link) {
        return {
            error: "Vui lòng nhập đầy đủ thông tin rạp"
        };
    }

    if (cinema_name.trim().length < 5) {
        return {
            field: 'cinema_name',
            error: "Tên rạp phải từ 5 ký tự trở lên"
        };
    }

    if (!/^[0-9]{8,15}$/.test(hotline)) {
        return {
            field: 'hotline',
            error: "Hotline không hợp lệ"
        };
    }

    try {
        new URL(map_link);
    } catch {
        return {
            field: 'map_link',
            error: "Link Google Map không hợp lệ"
        };
    }

    return null;
};

/* =========================================================
    1. GET ALL CINEMAS
========================================================= */

exports.getAllCinemas = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *,
            DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS formatted_date
            FROM cinemas
            ORDER BY cinema_id DESC
        `);

        return res.status(200).json(rows);

    } catch (error) {
        console.error("Get All Cinemas Error:", error);

        return res.status(500).json({
            error: "Lỗi hệ thống khi lấy danh sách rạp"
        });
    }
};

/* =========================================================
    2. CREATE CINEMA
========================================================= */

exports.createCinema = async (req, res) => {
    try {
        const {
            cinema_name,
            address,
            city,
            hotline,
            map_link
        } = req.body;

        const validationError = validateCinemaData(req.body);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const name = cinema_name.trim();

        // CHECK DUP NAME
        const [existing] = await db.query(
            `SELECT cinema_id FROM cinemas WHERE cinema_name = ?`,
            [name]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                field: 'cinema_name',
                error: "Tên rạp này đã tồn tại"
            });
        }

        // CHECK HOTLINE
        const [existingHotline] = await db.query(
            `SELECT cinema_id FROM cinemas WHERE hotline = ?`,
            [hotline]
        );

        if (existingHotline.length > 0) {
            return res.status(400).json({
                field: 'hotline',
                error: "Số hotline này đã tồn tại"
            });
        }

        const slug = createSlug(name);

        const [result] = await db.query(
            `
            INSERT INTO cinemas
            (cinema_name, address, city, hotline, map_link, slug)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                name,
                address,
                city,
                hotline,
                map_link,
                slug
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Thêm rạp thành công",
            cinema_id: result.insertId
        });

    } catch (err) {
        console.error("Create Cinema Error:", err);

        return res.status(500).json({
            error: "Lỗi hệ thống khi tạo rạp"
        });
    }
};

/* =========================================================
    3. UPDATE CINEMA
========================================================= */

exports.updateCinema = async (req, res) => {
    const { cinema_id } = req.params;

    try {
        const {
            cinema_name,
            address,
            city,
            hotline,
            map_link
        } = req.body;

        const validationError = validateCinemaData(req.body);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const name = cinema_name.trim();

        const [existing] = await db.query(
            `SELECT cinema_id FROM cinemas 
             WHERE cinema_name = ? AND cinema_id != ?`,
            [name, cinema_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                field: 'cinema_name',
                error: "Tên rạp này đã được sử dụng"
            });
        }

        const [existingHotline] = await db.query(
            `SELECT cinema_id FROM cinemas 
             WHERE hotline = ? AND cinema_id != ?`,
            [hotline, cinema_id]
        );

        if (existingHotline.length > 0) {
            return res.status(400).json({
                field: 'hotline',
                error: "Số hotline đã được sử dụng"
            });
        }

        const slug = createSlug(name);

        const [result] = await db.query(
            `
            UPDATE cinemas
            SET cinema_name = ?, address = ?, city = ?, hotline = ?, map_link = ?, slug = ?
            WHERE cinema_id = ?
            `,
            [
                name,
                address,
                city,
                hotline,
                map_link,
                slug,
                cinema_id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Không tìm thấy rạp để cập nhật"
            });
        }

        return res.status(200).json({
            message: "Cập nhật rạp thành công!"
        });

    } catch (err) {
        console.error("Update Cinema Error:", err);

        return res.status(500).json({
            error: "Lỗi hệ thống khi cập nhật rạp"
        });
    }
};

/* =========================================================
    4. DELETE CINEMA
========================================================= */

exports.deleteCinema = async (req, res) => {
    const { cinema_id } = req.params;

    try {
        const [result] = await db.query(
            `DELETE FROM cinemas WHERE cinema_id = ?`,
            [cinema_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Không tìm thấy rạp"
            });
        }

        return res.status(200).json({
            message: "Xóa rạp thành công"
        });

    } catch (err) {
        return res.status(500).json({
            error: "Không thể xóa rạp (có thể đang liên kết dữ liệu)"
        });
    }
};

/* =========================================================
    5. GET CINEMA BY SLUG
========================================================= */

exports.getCinemaBySlug = async (req, res) => {
    const { slug } = req.params;

    try {
        const [cinemas] = await db.execute(
            `SELECT * FROM cinemas WHERE slug = ?`,
            [slug]
        );

        if (!cinemas.length) {
            return res.status(404).json({
                error: "Không tìm thấy rạp này"
            });
        }

        const cinema = cinemas[0];

        const [rows] = await db.execute(
            `
            SELECT m.movie_id, m.title, m.poster_url, s.showtime_id, s.start_time
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.cinema_id = ?
            ORDER BY s.start_time ASC
            `,
            [cinema.cinema_id]
        );

        const map = {};

        rows.forEach(row => {
            if (!map[row.movie_id]) {
                map[row.movie_id] = {
                    movie_id: row.movie_id,
                    title: row.title,
                    poster_url: row.poster_url,
                    showtimes: []
                };
            }

            map[row.movie_id].showtimes.push({
                showtime_id: row.showtime_id,
                start_time: row.start_time
            });
        });

        return res.json({
            cinema,
            movies: Object.values(map)
        });

    } catch (error) {
        return res.status(500).json({
            error: "Lỗi server",
            details: error.message
        });
    }
};

/* =========================================================
    6. GET CINEMA BY ID
========================================================= */

exports.getCinemaById = async (req, res) => {
    const { cinema_id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT * FROM cinemas WHERE cinema_id = ?`,
            [cinema_id]
        );

        if (!rows.length) {
            return res.status(404).json({
                error: "Không tìm thấy rạp"
            });
        }

        return res.status(200).json(rows[0]);

    } catch (error) {
        return res.status(500).json({
            error: "Lỗi hệ thống"
        });
    }
};
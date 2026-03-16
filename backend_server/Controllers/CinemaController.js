const db = require('../Config/db');

const createSlug = (text) => {
    return text.toString().toLowerCase().trim()
        .normalize('NFD') // Chuyển về dạng tổ hợp để bỏ dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '') // Xóa ký tự đặc biệt
        .replace(/(\s+)/g, '-')         // Thay khoảng trắng bằng gạch ngang
        .replace(/-+/g, '-')             // Tránh nhiều gạch ngang liên tiếp
        .replace(/^-+|-+$/g, '');       // Xóa gạch ngang ở đầu và cuối
};

/**
 * HÀM HỖ TRỢ: Kiểm tra dữ liệu Rạp
 */
const validateCinemaData = (data) => {
    const { cinema_name, address, city } = data;
    if (!cinema_name || !address || !city) {
        return { error: "Vui lòng nhập đầy đủ tên rạp, địa chỉ và thành phố" };
    }
    if (cinema_name.trim().length < 5) {
        return { field: 'cinema_name', error: "Tên rạp phải từ 5 ký tự trở lên" };
    }
    return null;
};

// 1. Lấy danh sách rạp
exports.getAllCinemas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cinemas ORDER BY cinema_id DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Get All Cinemas Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách rạp" });
    }
};

// 2. Thêm rạp mới (Đã bổ sung SLUG)
exports.createCinema = async (req, res) => {
    try {
        const { cinema_name, address, city } = req.body;

        const validationError = validateCinemaData(req.body);
        if (validationError) return res.status(400).json(validationError);

        // KIỂM TRA TRÙNG TÊN RẠP
        const [existing] = await db.query(
            'SELECT cinema_name FROM cinemas WHERE cinema_name = ?',
            [cinema_name.trim()]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                field: 'cinema_name', 
                error: "Tên rạp này đã tồn tại, vui lòng nhập tên khác" 
            });
        }

        // TẠO SLUG TỰ ĐỘNG
        const slug = createSlug(cinema_name);

        const sql = `INSERT INTO cinemas (cinema_name, address, city, slug) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(sql, [cinema_name.trim(), address, city, slug]);

        res.status(201).json({ 
            message: "Thêm rạp thành công", 
            cinema_id: result.insertId 
        });

    } catch (err) {
        console.error("Create Cinema Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi tạo rạp" });
    }
};

// 3. Cập nhật rạp (Đã bổ sung cập nhật SLUG)
exports.updateCinema = async (req, res) => {
    const { cinema_id } = req.params;
    const { cinema_name, address, city } = req.body;

    try {
        const validationError = validateCinemaData(req.body);
        if (validationError) return res.status(400).json(validationError);

        // KIỂM TRA TRÙNG TÊN (Trừ chính nó)
        const [existing] = await db.query(
            'SELECT cinema_name FROM cinemas WHERE cinema_name = ? AND cinema_id != ?',
            [cinema_name.trim(), cinema_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                field: 'cinema_name', 
                error: "Tên rạp này đã được sử dụng cho rạp khác" 
            });
        }

        // TẠO SLUG MỚI KHI ĐỔI TÊN RẠP
        const slug = createSlug(cinema_name);

        const sql = `UPDATE cinemas SET cinema_name = ?, address = ?, city = ?, slug = ? WHERE cinema_id = ?`;
        const [result] = await db.query(sql, [cinema_name.trim(), address, city, slug, cinema_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy rạp để cập nhật" });
        }

        res.status(200).json({ message: "Cập nhật rạp thành công!" });

    } catch (err) {
        console.error("Update Cinema Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật rạp" });
    }
};

// 4. Xóa rạp
exports.deleteCinema = async (req, res) => {
    const { cinema_id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM cinemas WHERE cinema_id = ?', [cinema_id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy rạp" });
        }
        
        res.status(200).json({ message: "Xóa rạp thành công" });
    } catch (err) {
        console.error("Delete Cinema Error:", err);
        res.status(500).json({ error: "Không thể xóa rạp (Rạp đang có dữ liệu liên quan)" });
    }
};

// 5. Lấy chi tiết rạp theo Slug
exports.getCinemaBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const [cinemas] = await db.execute(
            'SELECT * FROM cinemas WHERE slug = ?', 
            [slug]
        );

        if (cinemas.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy rạp này" });
        }

        const cinema = cinemas[0];

        const query = `
            SELECT 
                m.movie_id, 
                m.title, 
                m.poster_url, 
                s.showtime_id, 
                s.start_time
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.cinema_id = ?
            ORDER BY s.start_time ASC
        `;

        const [rows] = await db.execute(query, [cinema.cinema_id]);

        const moviesMap = {};
        rows.forEach(row => {
            if (!moviesMap[row.movie_id]) {
                moviesMap[row.movie_id] = {
                    movie_id: row.movie_id,
                    title: row.title,
                    poster_url: row.poster_url,
                    showtimes: []
                };
            }
            moviesMap[row.movie_id].showtimes.push({
                showtime_id: row.showtime_id,
                start_time: row.start_time 
            });
        });

        res.json({
            cinema: cinema,
            movies: Object.values(moviesMap)
        });

    } catch (error) {
        console.error("Lỗi SQL:", error);
        res.status(500).json({ error: "Lỗi server", details: error.message });
    }
};
// 1.5 Lấy chi tiết rạp theo ID (Dùng cho trang Update ở Admin)
exports.getCinemaById = async (req, res) => {
    const { cinema_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM cinemas WHERE cinema_id = ?', [cinema_id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy rạp" });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Get Cinema By ID Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy thông tin rạp" });
    }
};
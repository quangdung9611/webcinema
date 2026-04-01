const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
   ========================================================== */

/**
 * Tạo slug từ tiêu đề phim
 */
const createSlug = (title) => {
    if (!title) return "";
    return title.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Validate dữ liệu đầu vào
 */
const validateMovieData = (data, file, isUpdate = false) => {
    const { title, duration, release_date, status } = data;

    if (!title || title.trim().length < 2) 
        return "Tiêu đề phim phải từ 2 ký tự trở lên.";

    if (!duration || isNaN(duration) || duration <= 0) 
        return "Thời lượng phải là số dương.";

    if (!release_date) 
        return "Vui lòng chọn ngày phát hành.";

    // --- BỔ SUNG LOGIC NGÀY THÁNG ---
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    if (status === "Sắp chiếu" && new Date(release_date) < now) {
        console.log("⚠️ [Validation Failed] Thử thêm phim 'Sắp chiếu' với ngày quá khứ.");
        return "Phim 'Sắp chiếu' thì ngày phát hành không được ở quá khứ.";
    }
    // --------------------------------

    if (!isUpdate && !file) 
        return "Vui lòng upload ảnh poster.";

    return null;
};

/**
 * Xóa file vật lý trên server
 */
const deleteFile = (fileName) => {
    if (!fileName) return;

    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'posters', pureFileName); 

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("✅ Đã xóa file cũ thành công");
        }
    } catch (err) {
        console.error("❌ Lỗi khi xóa file vật lý:", err.message);
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

exports.getMovieBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // 1. Lấy thông tin phim và Đánh giá trung bình
        const [movieRows] = await db.query(`
            SELECT 
                m.*, 
                COUNT(r.review_id) AS total_reviews,
                IFNULL(ROUND(AVG(r.rating_score), 1), 0) AS avg_rating 
            FROM movies m
            LEFT JOIN reviews r ON m.movie_id = r.movie_id
            WHERE m.slug = ?
            GROUP BY m.movie_id
        `, [slug]);

        const movie = movieRows[0];
        if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

        // 2. Lấy danh sách THỂ LOẠI
        const [genres] = await db.query(`
            SELECT g.genre_id, g.genre_name
            FROM genres g
            JOIN movie_genres mg ON g.genre_id = mg.genre_id
            WHERE mg.movie_id = ?
        `, [movie.movie_id]);

        // 3. Lấy danh sách diễn viên
        const [actors] = await db.query(`
            SELECT a.actor_id, a.name, a.avatar, a.slug
            FROM actors a
            JOIN movie_actors ma ON a.actor_id = ma.actor_id
            WHERE ma.movie_id = ?
        `, [movie.movie_id]);

        // 4. Lấy lịch chiếu
        let showtimes = [];
        if (movie.status === "Đang chiếu") {
            const [rows] = await db.query(`
                SELECT 
                    s.showtime_id, s.start_time, r.room_name, r.room_type, 
                    c.cinema_name, c.address
                FROM showtimes s
                JOIN rooms r ON s.room_id = r.room_id
                JOIN cinemas c ON r.cinema_id = c.cinema_id
                WHERE s.movie_id = ? AND s.start_time >= NOW()
                ORDER BY s.start_time ASC
            `, [movie.movie_id]);
            showtimes = rows;
        } else {
            console.log(`ℹ️ [Info] Phim "${movie.title}" ẩn suất chiếu vì đang ở trạng thái: ${movie.status}`);
        }

        movie.genres = genres; 
        movie.actors = actors;
        movie.showtimes = showtimes;

        delete movie.genre_name;

        res.status(200).json(movie);
    } catch (error) {
        console.error("Lỗi getMovieBySlug:", error);
        res.status(500).json({ error: error.message });
    }
};

// [GET] /api/movies
exports.getAllMovies = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM movies ORDER BY created_at DESC");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error getAllMovies:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách phim." });
    }
};

// [GET] /api/movies/:id
exports.getMovieById = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM movies WHERE movie_id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy phim." });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống." });
    }
};

// [POST] /api/movies/add
exports.addMovie = async (req, res) => {
    // Bổ sung nation từ req.body
    const { title, description, director, nation, duration, age_rating, release_date, status, trailer_url } = req.body;

    const errorMsg = validateMovieData(req.body, req.file, false);
    if (errorMsg) {
        if (req.file) deleteFile(req.file.originalname);
        return res.status(400).json({ error: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const cleanDate = release_date ? release_date.substring(0, 10) : null;
        const poster_url = req.file.originalname; 

        // Thêm nation vào câu query INSERT
        await connection.query(
            `INSERT INTO movies (title, slug, description, director, nation, duration, age_rating, poster_url, trailer_url, release_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title.trim(), createSlug(title), description || "", director || "", nation || null, duration, age_rating || 0, poster_url, trailer_url || null, cleanDate, status || "Sắp chiếu"]
        );

        await connection.commit();
        console.log(`✅ [Success] Admin Dũng đã thêm phim mới thành công: ${title}`);
        res.status(201).json({ message: "Thêm phim thành công!" });
    } catch (error) {
        await connection.rollback();
        if (req.file) deleteFile(req.file.originalname);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// [PUT] /api/movies/update/:id
exports.updateMovie = async (req, res) => {
    const { id } = req.params;
    // Bổ sung nation từ req.body
    const { title, director, nation, duration, age_rating, release_date, status, description, trailer_url } = req.body;
    
    const errorMsg = validateMovieData(req.body, req.file, true);
    if (errorMsg) return res.status(400).json({ error: errorMsg });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [old] = await connection.query("SELECT poster_url FROM movies WHERE movie_id = ?", [id]);
        if (old.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Phim không tồn tại." });
        }

        const cleanDate = release_date ? release_date.substring(0, 10) : null;
        let poster_url = old[0].poster_url;

        if (req.file) {
            deleteFile(old[0].poster_url);
            poster_url = req.file.originalname;
        }

        // Cập nhật nation vào câu query UPDATE
        await connection.query(
            `UPDATE movies 
             SET title=?, slug=?, director=?, nation=?, duration=?, age_rating=?, release_date=?, status=?, description=?, poster_url=?, trailer_url=? 
             WHERE movie_id=?`,
            [title.trim(), createSlug(title), director || "", nation || null, duration, age_rating || 0, cleanDate, status || "Sắp chiếu", description || "", poster_url, trailer_url || null, id]
        );

        await connection.commit();
        console.log(`✅ [Success] Đã cập nhật phim ID: ${id}`);
        res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: "Lỗi server: " + error.message });
    } finally {
        connection.release();
    }
};

// [DELETE] /api/movies/:id
exports.deleteMovie = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [movie] = await connection.query("SELECT poster_url FROM movies WHERE movie_id = ?", [req.params.id]);
        if (movie.length > 0) {
            deleteFile(movie[0].poster_url);
        }

        await connection.query("DELETE FROM movies WHERE movie_id = ?", [req.params.id]);
        
        await connection.commit();
        res.status(200).json({ message: "Đã xóa phim và ảnh thành công." });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: "Lỗi khi xóa phim." });
    } finally {
        connection.release();
    }
};

// Lấy phim theo nhóm trạng thái (Cho Mega Menu / Trang chủ)
exports.getMoviesByStatusGroup = async (req, res) => {
    try {
        // Thêm nation vào câu lệnh SELECT
        const [rows] = await db.query(
            "SELECT movie_id, title, slug, poster_url, status, age_rating, trailer_url, nation FROM movies WHERE status != 'Ngừng chiếu' ORDER BY release_date DESC"
        );
        
        const grouped = {
            "Đang chiếu": rows.filter(m => m.status === "Đang chiếu").slice(0, 4),
            "Sắp chiếu": rows.filter(m => m.status === "Sắp chiếu").slice(0, 4)
        };
        
        res.json(grouped);
    } catch (error) {
        console.error("Lỗi getMoviesByStatusGroup:", error); 
        res.status(500).json({ message: "Lỗi server" });
    }
};

// [GET] /api/movies/list/:statusSlug - Lấy danh sách phim cho trang Category
exports.getMoviesByStatusSlug = async (req, res) => {
    try {
        const { statusSlug } = req.params;
        let dbStatus = "";

        if (statusSlug === "phim-dang-chieu") {
            dbStatus = "Đang chiếu";
        } else if (statusSlug === "phim-sap-chieu") {
            dbStatus = "Sắp chiếu";
        } else {
            return res.status(400).json({ message: "Đường dẫn không hợp lệ" });
        }

        // SELECT * đã bao gồm nation
        const [rows] = await db.query(
            "SELECT * FROM movies WHERE status = ? ORDER BY release_date DESC",
            [dbStatus]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Hiện chưa có phim trong mục này." });
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi getMoviesByStatusSlug:", error);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách phim" });
    }
};
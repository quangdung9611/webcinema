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
    if (!title) {
        return "";
    }
    return title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Validate dữ liệu đầu vào cho Phim (Movies) dựa trên CSDL
 */
const validateMovieData = (data, files, isUpdate = false) => {
    const { 
        title, 
        duration, 
        release_date, 
        status, 
        director, 
        nation, 
        age_rating, 
        trailer_url 
    } = data;

    // 1. Kiểm tra Tiêu đề phim
    if (!title || title.trim() === "") {
        return "Vui lòng nhập tiêu đề phim.";
    }
    if (title.trim().length < 2) {
        return "Tiêu đề phim phải từ 2 ký tự trở lên.";
    }

    // 2. Kiểm tra Đạo diễn
    if (!director || director.trim() === "") {
        return "Vui lòng nhập tên đạo diễn.";
    }

    // 3. Kiểm tra Quốc gia
    if (!nation || nation.trim() === "") {
        return "Vui lòng nhập quốc gia sản xuất.";
    }

    // 4. Kiểm tra Thời lượng
    if (!duration || isNaN(duration) || parseInt(duration, 10) <= 0) {
        return "Thời lượng phim phải là số nguyên dương tính bằng phút.";
    }

    // 5. Kiểm tra Giới hạn độ tuổi
    if (age_rating === undefined || age_rating === null || age_rating === "") {
        return "Vui lòng chọn giới hạn độ tuổi (C13, C16, C18, P...).";
    }

    // 6. Kiểm tra Ngày phát hành
    if (!release_date || release_date.trim() === "") {
        return "Vui lòng chọn ngày phát hành phim.";
    }

    // 7. Kiểm tra trạng thái phim
    const validStatuses = ['Đang chiếu', 'Sắp chiếu', 'Ngừng chiếu'];
    if (!status || !validStatuses.includes(status)) {
        return "Trạng thái phim không hợp lệ.";
    }

    // 8. Kiểm tra định dạng link Trailer
    if (trailer_url && trailer_url.trim() !== "") {
        if (!trailer_url.startsWith("http://") && !trailer_url.startsWith("https://")) {
            return "Đường dẫn Trailer không hợp lệ (phải bắt đầu bằng http:// hoặc https://).";
        }
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); 

    // Chỉ chặn ngày quá khứ nếu là THÊM MỚI
    if (!isUpdate && status === "Sắp chiếu" && new Date(release_date) < now) {
        console.log("⚠️ [Validation Failed] Thử thêm phim 'Sắp chiếu' với ngày quá khứ.");
        return "Phim 'Sắp chiếu' thì ngày phát hành không được ở quá khứ.";
    }

    // Kiểm tra upload file cho trường hợp thêm mới
    if (!isUpdate && (!files || !files['posters'])) {
        return "Vui lòng upload ảnh poster cho phim.";
    }

    return null;
};

/**
 * Xóa file vật lý trên server
 */
const deleteFile = (fileName, subFolder = 'posters') => {
    if (!fileName || fileName === 'null' || fileName === 'undefined') {
        return;
    }

    const pureFileName = path.basename(fileName);
    const filePath = path.join(
        __dirname, 
        '..', 
        'uploads', 
        subFolder, 
        pureFileName
    ); 

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Đã xóa file cũ trong ${subFolder} thành công:`, pureFileName);
        }
    } catch (err) {
        console.error(`❌ Lỗi khi xóa file trong ${subFolder}:`, err.message);
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

// Lấy chi tiết phim theo Slug
exports.getMovieBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

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
        if (!movie) {
            return res.status(404).json({ 
                message: "Không tìm thấy phim" 
            });
        }

        const [genres] = await db.query(`
            SELECT g.genre_id, g.genre_name
            FROM genres g
            JOIN movie_genres mg ON g.genre_id = mg.genre_id
            WHERE mg.movie_id = ?
        `, [movie.movie_id]);

        const [actors] = await db.query(`
            SELECT a.actor_id, a.name, a.avatar, a.slug
            FROM actors a
            JOIN movie_actors ma ON a.actor_id = ma.actor_id
            WHERE ma.movie_id = ?
        `, [movie.movie_id]);

        let showtimes = [];
        if (movie.status === "Đang chiếu") {
            const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
            
            const [rows] = await db.query(`
                SELECT 
                    s.showtime_id, 
                    s.start_time, 
                    r.room_name, 
                    r.room_type, 
                    c.cinema_name, 
                    c.address
                FROM showtimes s
                JOIN rooms r ON s.room_id = r.room_id
                JOIN cinemas c ON r.cinema_id = c.cinema_id
                WHERE s.movie_id = ? AND s.start_time >= ?
                ORDER BY s.start_time ASC
            `, [movie.movie_id, nowVN]);
            showtimes = rows;
        }

        movie.genres = genres; 
        movie.actors = actors;
        movie.showtimes = showtimes;

        delete movie.genre_name;

        res.status(200).json(movie);
    } catch (error) {
        console.error("Lỗi getMovieBySlug:", error);
        res.status(500).json({ 
            error: error.message 
        });
    }
};

// Lấy danh sách toàn bộ phim
exports.getAllMovies = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM movies ORDER BY created_at DESC"
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error getAllMovies:", error);
        res.status(500).json({ 
            error: "Lỗi khi lấy danh sách phim." 
        });
    }
};

// Lấy chi tiết phim theo ID
exports.getMovieById = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM movies WHERE movie_id = ?", 
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ 
                error: "Không tìm thấy phim." 
            });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ 
            error: "Lỗi hệ thống." 
        });
    }
};

/* ==========================================================
    3. ADD MOVIE
   ========================================================== */
exports.addMovie = async (req, res) => {
    const { 
        title, 
        description, 
        director, 
        nation, 
        duration, 
        age_rating, 
        release_date, 
        status, 
        trailer_url, 
        total_likes 
    } = req.body;
    const files = req.files || {};

    const errorMsg = validateMovieData(req.body, files, false);
    if (errorMsg) {
        if (files['posters']?.[0]?.filename) {
            deleteFile(files['posters'][0].filename, 'posters');
        }
        if (files['backdrop_url']?.[0]?.filename) {
            deleteFile(files['backdrop_url'][0].filename, 'backdrops');
        }
        return res.status(400).json({ 
            error: errorMsg 
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const slug = createSlug(title);

        // Kiểm tra trùng tên hoặc slug trong hệ thống
        const [dup] = await connection.query(
            "SELECT movie_id FROM movies WHERE title = ? OR slug = ?",
            [
                title.trim(), 
                slug
            ]
        );

        if (dup.length > 0) {
            if (files['posters']?.[0]?.filename) {
                deleteFile(files['posters'][0].filename, 'posters');
            }
            if (files['backdrop_url']?.[0]?.filename) {
                deleteFile(files['backdrop_url'][0].filename, 'backdrops');
            }

            await connection.rollback();
            return res.status(400).json({
                error: "Phim này đã tồn tại trong hệ thống (trùng tên hoặc đường dẫn slug)."
            });
        }

        const cleanDate = release_date ? release_date.substring(0, 10) : null;
        const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

        const poster_url = files['posters']?.[0]?.filename || null;
        const backdrop_url = files['backdrop_url']?.[0]?.filename || null;

        const sql = `
            INSERT INTO movies (
                title, 
                slug, 
                description, 
                director, 
                nation, 
                duration, 
                age_rating, 
                poster_url, 
                backdrop_url, 
                trailer_url, 
                release_date, 
                status, 
                total_likes, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await connection.query(
            sql, 
            [
                title.trim(), 
                slug, 
                description ? description.trim() : "", 
                director.trim(), 
                nation.trim(), 
                parseInt(duration, 10), 
                age_rating, 
                poster_url, 
                backdrop_url, 
                trailer_url ? trailer_url.trim() : null, 
                cleanDate, 
                status, 
                parseInt(total_likes, 10) || 0, 
                nowVN
            ]
        );

        await connection.commit();
        res.status(201).json({ 
            message: "Thêm phim thành công!" 
        });
    } catch (error) {
        await connection.rollback();
        if (files['posters']?.[0]?.filename) {
            deleteFile(files['posters'][0].filename, 'posters');
        }
        if (files['backdrop_url']?.[0]?.filename) {
            deleteFile(files['backdrop_url'][0].filename, 'backdrops');
        }
        res.status(500).json({ 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================
    4. UPDATE MOVIE
   ========================================================== */
exports.updateMovie = async (req, res) => {
    const { id } = req.params;
    const { 
        title, 
        director, 
        nation, 
        duration, 
        age_rating, 
        release_date, 
        status, 
        description, 
        trailer_url, 
        total_likes 
    } = req.body;
    const files = req.files || {};

    const errorMsg = validateMovieData(req.body, files, true);
    if (errorMsg) {
        if (files['posters']?.[0]?.filename) {
            deleteFile(files['posters'][0].filename, 'posters');
        }
        if (files['backdrop_url']?.[0]?.filename) {
            deleteFile(files['backdrop_url'][0].filename, 'backdrops');
        }
        return res.status(400).json({ 
            error: errorMsg 
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Kiểm tra phim mục tiêu có tồn tại không
        const [old] = await connection.query(
            "SELECT poster_url, backdrop_url FROM movies WHERE movie_id = ?",
            [id]
        );

        if (old.length === 0) {
            if (files['posters']?.[0]?.filename) {
                deleteFile(files['posters'][0].filename, 'posters');
            }
            if (files['backdrop_url']?.[0]?.filename) {
                deleteFile(files['backdrop_url'][0].filename, 'backdrops');
            }
            await connection.rollback();
            return res.status(404).json({ 
                error: "Phim không tồn tại." 
            });
        }

        const slug = createSlug(title);

        // Kiểm tra trùng tên hoặc slug với phim KHÁC
        const [dup] = await connection.query(
            "SELECT movie_id FROM movies WHERE (title = ? OR slug = ?) AND movie_id != ?",
            [
                title.trim(), 
                slug, 
                id
            ]
        );

        if (dup.length > 0) {
            if (files['posters']?.[0]?.filename) {
                deleteFile(files['posters'][0].filename, 'posters');
            }
            if (files['backdrop_url']?.[0]?.filename) {
                deleteFile(files['backdrop_url'][0].filename, 'backdrops');
            }
            await connection.rollback();
            return res.status(400).json({
                error: "Tên phim hoặc đường dẫn slug mới đã trùng với một phim khác."
            });
        }

        // Biến gánh dữ liệu ảnh an toàn
        let finalPoster = old[0].poster_url;
        let finalBackdrop = old[0].backdrop_url;

        // Xử lý cập nhật Poster
        if (files['posters']) {
            const newPosterName = files['posters'][0].filename;
            // Chỉ xóa file cũ khi tên file mới hoàn toàn khác tên file cũ
            if (newPosterName !== old[0].poster_url) {
                deleteFile(old[0].poster_url, 'posters');
            }
            finalPoster = newPosterName;
        }

        // Xử lý cập nhật Backdrop
        if (files['backdrop_url']) {
            const newBackdropName = files['backdrop_url'][0].filename;
            // Chỉ xóa file cũ khi tên file mới hoàn toàn khác tên file cũ
            if (newBackdropName !== old[0].backdrop_url) {
                deleteFile(old[0].backdrop_url, 'backdrops');
            }
            finalBackdrop = newBackdropName;
        }

        const sql = `
            UPDATE movies SET
                title = ?, 
                slug = ?, 
                director = ?, 
                nation = ?,
                duration = ?, 
                age_rating = ?, 
                release_date = ?,
                status = ?, 
                description = ?, 
                poster_url = ?,
                backdrop_url = ?, 
                trailer_url = ?, 
                total_likes = ?
             WHERE movie_id = ?`;

        await connection.query(
            sql, 
            [
                title.trim(), 
                slug, 
                director.trim(), 
                nation.trim(), 
                parseInt(duration, 10), 
                age_rating, 
                release_date?.substring(0, 10) || null, 
                status, 
                description ? description.trim() : "", 
                finalPoster, 
                finalBackdrop, 
                trailer_url ? trailer_url.trim() : null, 
                parseInt(total_likes, 10) || 0, 
                id
            ]
        );

        await connection.commit();
        res.status(200).json({ 
            message: "Cập nhật thông tin phim thành công!" 
        });
    } catch (error) {
        await connection.rollback();
        if (files['posters']?.[0]?.filename) {
            deleteFile(files['posters'][0].filename, 'posters');
        }
        if (files['backdrop_url']?.[0]?.filename) {
            deleteFile(files['backdrop_url'][0].filename, 'backdrops');
        }
        res.status(500).json({ 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================
    5. DELETE MOVIE
   ========================================================== */
exports.deleteMovie = async (req, res) => {
    const { id } = req.params;
    const { token } = req.body; // Bổ sung usertoken bảo mật của ông Dũng

    const connection = await db.getConnection();
    try {
        if (!token) {
            return res.status(401).json({ 
                error: "Thiếu usertoken bảo mật!" 
            });
        }

        await connection.beginTransaction();

        const [movie] = await connection.query(
            "SELECT poster_url, backdrop_url FROM movies WHERE movie_id = ?", 
            [id]
        );
        if (movie.length > 0) {
            deleteFile(movie[0].poster_url, 'posters');
            deleteFile(movie[0].backdrop_url, 'backdrops'); 
        }

        await connection.query(
            "DELETE FROM movies WHERE movie_id = ?", 
            [id]
        );
        
        await connection.commit();
        res.status(200).json({ 
            message: "Đã xóa phim và ảnh thành công." 
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ 
            error: "Lỗi khi xóa phim." 
        });
    } finally {
        connection.release();
    }
};

/* ==========================================================
    6. OTHERS EXTENSION FUNCTIONS
   ========================================================== */

// Lấy danh sách phim hiển thị theo cụm trạng thái (Trang chủ Client)
exports.getMoviesByStatusGroup = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                movie_id, 
                title, 
                slug, 
                poster_url, 
                backdrop_url, 
                status, 
                age_rating, 
                trailer_url, 
                nation, 
                total_likes 
             FROM movies 
             WHERE status != 'Ngừng chiếu' 
             ORDER BY release_date DESC`
        );
        
        const grouped = {
            "Đang chiếu": rows.filter(m => m.status === "Đang chiếu").slice(0, 4),
            "Sắp chiếu": rows.filter(m => m.status === "Sắp chiếu").slice(0, 4)
        };
        
        res.json(grouped);
    } catch (error) {
        console.error("Lỗi getMoviesByStatusGroup:", error); 
        res.status(500).json({ 
            message: "Lỗi server" 
        });
    }
};

// Lấy danh sách phim theo phân loại đường dẫn slug (Đang chiếu / Sắp chiếu)
exports.getMoviesByStatusSlug = async (req, res) => {
    try {

        const { statusSlug } = req.params;

        // Map URL slug -> movies.status trong DB
        const statusMap = {
            "phim-dang-chieu":
                "Đang chiếu",

            "phim-sap-chieu":
                "Sắp chiếu"
        };

        const dbStatus =
            statusMap[statusSlug];

        if (!dbStatus) {
            return res.status(400).json({
                message:
                    "Đường dẫn không hợp lệ"
            });
        }

        const [rows] =
            await db.query(
                `SELECT
                    m.movie_id,
                    m.title,
                    m.slug,
                    m.poster_url,
                    m.backdrop_url,
                    m.status,
                    m.age_rating,
                    m.release_date,
                    m.duration,
                    m.trailer_url,
                    m.nation,
                    m.total_likes,

                    IFNULL(
                        ROUND(
                            AVG(
                                r.rating_score
                            ),
                            1
                        ),
                        0
                    ) AS average_rating

                FROM movies m

                LEFT JOIN reviews r
                    ON m.movie_id =
                       r.movie_id

                WHERE m.status = ?

                GROUP BY
                    m.movie_id

                ORDER BY
                    m.release_date DESC`,
                [dbStatus]
            );

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            "Lỗi getMoviesByStatusSlug:",
            error
        );

        res.status(500).json({
            message:
                "Lỗi server khi lấy danh sách phim"
        });
    }
};

// Tăng lượt thích phim
exports.likeMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            "UPDATE movies SET total_likes = total_likes + 1 WHERE movie_id = ?", 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "Phim không tồn tại" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Đã tăng lượt thích!" 
        });
    } catch (error) {
        console.error("Lỗi likeMovie:", error);
        res.status(500).json({ 
            error: "Lỗi hệ thống khi thích phim" 
        });
    }
};

// Cập nhật lượt xem phim
exports.incrementViews = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            "UPDATE movies SET views = views + 1 WHERE movie_id = ?", 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "Phim không tồn tại" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Đã tăng lượt xem!" 
        });
    } catch (error) {
        console.error("Lỗi incrementViews:", error);
        res.status(500).json({ 
            error: "Lỗi hệ thống khi cập nhật lượt xem" 
        });
    }
};

// Lấy danh sách phim theo bộ lọc thể loại (Genre Filter)
exports.getMoviesWithGenre = async (req, res) => {
    try {
        const { genre } = req.query;
        let params = [];

        let sql = `
            SELECT DISTINCT
                m.movie_id,
                m.title,
                m.slug,
                m.poster_url,
                m.status,
                m.age_rating,
                m.release_date,
                m.created_at
            FROM movies m
        `;

        if (genre) {
            sql += `
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.genre_id
                WHERE g.slug = ?
            `;
            params.push(genre);
        }

        sql += ` ORDER BY m.created_at DESC `;

        const [movies] = await db.query(sql, params);
        res.status(200).json(movies || []);

    } catch (error) {
        console.error("Lỗi getMoviesWithGenre:", error);
        res.status(500).json({ 
            message: "Lỗi server", 
            error: error.message 
        });
    }
};
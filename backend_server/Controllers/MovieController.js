// controllers/MovieController.js
const MovieService = require('../Services/MovieService');

/* ==========================================================
    GET MOVIE BY SLUG
========================================================== */
exports.getMovieBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await MovieService.getMovieBySlug(slug);
        return res.status(200).json(movie);
    } catch (err) {
        console.error("getMovieBySlug error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    GET ALL MOVIES (ADMIN & USER)
========================================================== */
exports.getAllMovies = async (req, res) => {
    try {
        // Thêm page, limit, search đồng bộ UserController
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await MovieService.getAllMovies(page, limit, search);
        return res.status(200).json({ success: true, data }); // Chuẩn format
    } catch (err) {
        console.error("getAllMovies error:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách phim"
        });
    }
};

/* ==========================================================
    GET MOVIE BY ID (ADMIN)
========================================================== */
exports.getMovieById = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const movie = await MovieService.getMovieById(movie_id);
        return res.status(200).json(movie);
    } catch (err) {
        console.error("getMovieById error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    CREATE MOVIE (ADMIN)
========================================================== */
exports.createMovie = async (req, res) => {
    try {
        const movieId = await MovieService.createMovie(req.body, req.files || {});
        return res.status(201).json({
            success: true,
            message: "Thêm phim thành công!",
            data: { movie_id: movieId }
        });
    } catch (err) {
        console.error("createMovie error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    UPDATE MOVIE (ADMIN)
========================================================== */
exports.updateMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.updateMovie(movie_id, req.body, req.files || {});
        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin phim thành công!"
        });
    } catch (err) {
        console.error("updateMovie error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    DELETE MOVIE (ADMIN)
========================================================== */
exports.deleteMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.deleteMovie(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa phim thành công."
        });
    } catch (err) {
        console.error("deleteMovie error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    GET MOVIES BY STATUS GROUP
========================================================== */
exports.getMoviesByStatusGroup = async (req, res) => {
    try {
        const grouped = await MovieService.getMoviesByStatusGroup();
        return res.status(200).json(grouped);
    } catch (err) {
        console.error("getMoviesByStatusGroup error:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

/* ==========================================================
    GET MOVIES BY STATUS SLUG (USER)
========================================================== */
exports.getMoviesByStatusSlug = async (req, res) => {
    try {
        const { statusSlug } = req.params;
        const { page = 1, limit = 20 } = req.query; // Thêm Pagination
        const statusMap = {
            "phim-dang-chieu": "Đang chiếu",
            "phim-sap-chieu": "Sắp chiếu"
        };
        const dbStatus = statusMap[statusSlug];
        if (!dbStatus) {
            return res.status(400).json({
                success: false,
                message: "Đường dẫn không hợp lệ"
            });
        }
        // Đồng bộ trả về { success: true, data }
        const data = await MovieService.getMoviesByStatus(dbStatus, page, limit);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("getMoviesByStatusSlug error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    LIKE MOVIE
========================================================== */
exports.likeMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.likeMovie(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt thích!"
        });
    } catch (err) {
        console.error("likeMovie error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    INCREMENT VIEWS
========================================================== */
exports.incrementViews = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.incrementViews(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt xem!"
        });
    } catch (err) {
        console.error("incrementViews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};

/* ==========================================================
    GET MOVIES WITH GENRE (USER)
========================================================== */
exports.getMoviesWithGenre = async (req, res) => {
    try {
        const { genre, page = 1, limit = 20 } = req.query; // Thêm Pagination
        const data = await MovieService.getMoviesByGenre(genre, page, limit);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("getMoviesWithGenre error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Lỗi server"
        });
    }
};
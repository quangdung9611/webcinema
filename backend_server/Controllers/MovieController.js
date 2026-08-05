// controllers/MovieController.js
const MovieService = require('../Services/MovieService');

/*=========================================================
    ADMIN - GET ALL MOVIES (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllMoviesAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        // ⚠️ Nếu có page hoặc limit → từ chối yêu cầu, trả về 400
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/movies không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/movies/paginated để phân trang."
            });
        }

        // Ngược lại, lấy toàn bộ phim (chỉ search)
        const data = await MovieService.getAllMoviesAll(search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get All Movies Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET MOVIES WITH PAGINATION
=========================================================*/
exports.getMoviesWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await MovieService.getAllMovies(page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Movies Paginated Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET MOVIE BY ID
=========================================================*/
exports.getMovieById = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const movie = await MovieService.getMovieById(movie_id);
        return res.status(200).json({ success: true, data: movie });
    } catch (err) {
        console.error("Get Movie By ID Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - CREATE MOVIE
=========================================================*/
exports.createMovie = async (req, res) => {
    try {
        const movieId = await MovieService.createMovie(req.body, req.files || {});
        return res.status(201).json({
            success: true,
            message: "Thêm phim thành công!",
            data: { movie_id: movieId }
        });
    } catch (err) {
        console.error("Create Movie Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE MOVIE
=========================================================*/
exports.updateMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.updateMovie(movie_id, req.body, req.files || {});
        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin phim thành công!"
        });
    } catch (err) {
        console.error("Update Movie Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - DELETE MOVIE
=========================================================*/
exports.deleteMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.deleteMovie(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa phim thành công."
        });
    } catch (err) {
        console.error("Delete Movie Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET MOVIE BY SLUG
=========================================================*/
exports.getMovieBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await MovieService.getMovieBySlug(slug);
        return res.status(200).json({ success: true, data: movie });
    } catch (err) {
        console.error("Get Movie By Slug Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET MOVIES BY STATUS GROUP
=========================================================*/
exports.getMoviesByStatusGroup = async (req, res) => {
    try {
        const grouped = await MovieService.getMoviesByStatusGroup();
        return res.status(200).json({ success: true, data: grouped });
    } catch (err) {
        console.error("Get Movies By Status Group Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET MOVIES BY STATUS SLUG (có phân trang)
=========================================================*/
exports.getMoviesByStatusSlug = async (req, res) => {
    try {
        const { statusSlug } = req.params;
        const { page = 1, limit = 20, search = "" } = req.query;
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
        const data = await MovieService.getMoviesByStatus(dbStatus, page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Movies By Status Slug Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET MOVIES WITH GENRE (có phân trang)
=========================================================*/
exports.getMoviesWithGenre = async (req, res) => {
    try {
        const { genre, page = 1, limit = 20, search = "" } = req.query;
        const data = await MovieService.getMoviesByGenre(genre, page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Movies With Genre Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - LIKE MOVIE
=========================================================*/
exports.likeMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.likeMovie(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt thích!"
        });
    } catch (err) {
        console.error("Like Movie Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - INCREMENT VIEWS
=========================================================*/
exports.incrementViews = async (req, res) => {
    try {
        const { movie_id } = req.params;
        await MovieService.incrementViews(movie_id);
        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt xem!"
        });
    } catch (err) {
        console.error("Increment Views Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
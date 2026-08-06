const MovieGenreRepository = require('../Repositories/MovieGenreRepository');

/* =========================================================
    Lấy tất cả gán thể loại cho từng phim
    GET /api/movie-genres/all
========================================================= */
exports.getAllAssignments = async (req, res) => {
    try {
        const assignments = await MovieGenreRepository.findAllAssignments();
        return res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error('❌ Lỗi getAllAssignments:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Lỗi hệ thống khi lấy danh sách thể loại phim'
        });
    }
};

/* =========================================================
    Lấy danh sách genre_id của một phim
    GET /api/movie-genres/:movie_id
========================================================= */
exports.getGenresByMovieId = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const genreIds = await MovieGenreRepository.findGenreIdsByMovieId(movie_id);
        return res.status(200).json({
            success: true,
            data: genreIds
        });
    } catch (error) {
        console.error('❌ Lỗi getGenresByMovieId:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Lỗi hệ thống'
        });
    }
};

/* =========================================================
    Cập nhật thể loại cho phim (xóa cũ + chèn mới)
    POST /api/movie-genres/update
========================================================= */
exports.updateMovieGenres = async (req, res) => {
    const { movie_id, genre_ids } = req.body;

    if (!movie_id) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu ID phim'
        });
    }

    try {
        await MovieGenreRepository.updateMovieGenres(movie_id, genre_ids);
        return res.status(200).json({
            success: true,
            message: 'Cập nhật thể loại cho phim thành công!'
        });
    } catch (error) {
        console.error('❌ Lỗi updateMovieGenres:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Lỗi hệ thống khi cập nhật thể loại'
        });
    }
};
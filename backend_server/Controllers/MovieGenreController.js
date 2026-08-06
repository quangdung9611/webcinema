const MovieGenreRepository = require('../Repositories/MovieGenreRepository');

/*=========================================================
    GET GENRES BY MOVIE ID
=========================================================*/
exports.getGenresByMovieId = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const genreIds = await MovieGenreRepository.findGenreIdsByMovieId(movie_id);
        
        return res.status(200).json({
            success: true,
            data: genreIds // [1, 2, 8]
        });
    } catch (error) {
        console.error("Lỗi getGenresByMovieId:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi khi lấy danh sách thể loại của phim."
        });
    }
};

/*=========================================================
    GET ALL ASSIGNMENTS (TẤT CẢ PHIM)
=========================================================*/
exports.getAllAssignments = async (req, res) => {
    try {
        const assignments = await MovieGenreRepository.findAllAssignments();
        
        return res.status(200).json({
            success: true,
            data: assignments // [{ movie_id: 5, genre_ids: [5,7] }, ...]
        });
    } catch (error) {
        console.error("Lỗi getAllAssignments:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi hệ thống khi lấy tất cả gán thể loại."
        });
    }
};

/*=========================================================
    UPDATE MOVIE GENRES
=========================================================*/
exports.updateMovieGenres = async (req, res) => {
    const { movie_id, genre_ids } = req.body;

    if (!movie_id) {
        return res.status(400).json({
            success: false,
            message: "Thiếu ID phim."
        });
    }

    try {
        await MovieGenreRepository.updateMovieGenres(movie_id, genre_ids);
        
        return res.status(200).json({
            success: true,
            message: "Cập nhật thể loại cho phim thành công!"
        });
    } catch (error) {
        console.error("Lỗi updateMovieGenres:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi hệ thống khi cập nhật thể loại."
        });
    }
};
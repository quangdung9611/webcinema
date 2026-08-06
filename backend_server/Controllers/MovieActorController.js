const MovieActorRepository = require('../Repositories/MovieActorRepository');

/*=========================================================
    GET ACTORS BY MOVIE ID
=========================================================*/
exports.getActorsByMovieId = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const actorIds = await MovieActorRepository.findActorIdsByMovieId(movie_id);
        
        return res.status(200).json({
            success: true,
            data: actorIds // [1, 2, 8]
        });
    } catch (error) {
        console.error("Lỗi getActorsByMovieId:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi khi lấy danh sách ID diễn viên của phim."
        });
    }
};

/*=========================================================
    GET ALL ASSIGNMENTS (TẤT CẢ PHIM)
=========================================================*/
exports.getAllAssignments = async (req, res) => {
    try {
        const assignments = await MovieActorRepository.findAllAssignments();
        
        return res.status(200).json({
            success: true,
            data: assignments // [{ movie_id: 5, actor_ids: [1,2] }, ...]
        });
    } catch (error) {
        console.error("Lỗi getAllAssignments (Actors):", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi hệ thống khi lấy tất cả gán diễn viên."
        });
    }
};

/*=========================================================
    UPDATE MOVIE ACTORS
=========================================================*/
exports.updateMovieActors = async (req, res) => {
    const { movie_id, actor_ids } = req.body;

    if (!movie_id) {
        return res.status(400).json({
            success: false,
            message: "Thiếu ID phim."
        });
    }

    try {
        await MovieActorRepository.updateMovieActors(movie_id, actor_ids);
        
        return res.status(200).json({
            success: true,
            message: "Cập nhật danh sách diễn viên thành công!"
        });
    } catch (error) {
        console.error("Lỗi updateMovieActors:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi hệ thống khi cập nhật diễn viên."
        });
    }
};
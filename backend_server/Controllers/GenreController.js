const GenreService = require("../Services/GenreService");

/* ==========================================================
    GET ALL
========================================================== */

exports.getAllGenres = async (req, res) => {
    try {
        const genres = await GenreService.getAllGenres();

        return res.status(200).json(genres);
    } catch (err) {
        console.error("getAllGenres error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    GET BY ID
========================================================== */

exports.getGenreById = async (req, res) => {
    try {
        const { genre_id } = req.params;

        const genre = await GenreService.getGenreById(genre_id);

        return res.status(200).json(genre);

    } catch (err) {
        console.error("getGenreById error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    CREATE
========================================================== */

exports.createGenre = async (req, res) => {
    try {

        const genreId = await GenreService.createGenre(req.body);

        return res.status(201).json({
            success: true,
            message: "Thêm thể loại thành công!",
            data: {
                genre_id: genreId
            }
        });

    } catch (err) {
        console.error("createGenre error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    UPDATE
========================================================== */

exports.updateGenre = async (req, res) => {
    try {

        const { genre_id } = req.params;

        await GenreService.updateGenre(
            genre_id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật thể loại thành công!"
        });

    } catch (err) {
        console.error("updateGenre error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    DELETE
========================================================== */

exports.deleteGenre = async (req, res) => {
    try {

        const { genre_id } = req.params;

        await GenreService.deleteGenre(genre_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa thể loại thành công."
        });

    } catch (err) {
        console.error("deleteGenre error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
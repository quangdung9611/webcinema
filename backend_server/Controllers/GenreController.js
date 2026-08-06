
const GenreService = require("../Services/GenreService");

// ==========================================================
// ADMIN - GET ALL GENRES
// KHÔNG PHÂN TRANG
// ==========================================================
exports.getAllGenresAll = async (req, res) => {
    try {
        const {
            search = "",
            page,
            limit
        } = req.query;

        // ------------------------------------------------------
        // ROUTE NÀY KHÔNG HỖ TRỢ PHÂN TRANG
        // Nếu có page hoặc limit -> từ chối
        // ------------------------------------------------------
        if (
            page !== undefined ||
            limit !== undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Route /api/genres không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/genres/paginated để phân trang."
            });
        }

        const data =
            await GenreService.getAllGenresAll(search);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error(
            "Get All Genres Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - GET GENRES WITH PAGINATION
// ==========================================================
exports.getGenresWithPagination = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = ""
        } = req.query;

        const data =
            await GenreService.getAllGenresPaginated(
                page,
                limit,
                search
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error(
            "Get Genres Paginated Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - GET GENRE BY ID
// ==========================================================
exports.getGenreById = async (req, res) => {
    try {
        const {
            genre_id
        } = req.params;

        const genre =
            await GenreService.getGenreById(
                genre_id
            );

        return res.status(200).json({
            success: true,
            data: genre
        });
    } catch (err) {
        console.error(
            "Get Genre By ID Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - CREATE GENRE
// ==========================================================
exports.createGenre = async (req, res) => {
    try {
        const genreId =
            await GenreService.createGenre(
                req.body
            );

        return res.status(201).json({
            success: true,
            message:
                "Thêm thể loại thành công!",
            data: {
                genre_id: genreId
            }
        });
    } catch (err) {
        console.error(
            "Create Genre Error:",
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - UPDATE GENRE
// ==========================================================
exports.updateGenre = async (req, res) => {
    try {
        const {
            genre_id
        } = req.params;

        await GenreService.updateGenre(
            genre_id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật thể loại thành công!"
        });
    } catch (err) {
        console.error(
            "Update Genre Error:",
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - DELETE GENRE
// ==========================================================
exports.deleteGenre = async (req, res) => {
    try {
        const {
            genre_id
        } = req.params;

        await GenreService.deleteGenre(
            genre_id
        );

        return res.status(200).json({
            success: true,
            message:
                "Đã xóa thể loại thành công."
        });
    } catch (err) {
        console.error(
            "Delete Genre Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message || "Lỗi máy chủ"
        });
    }
};


const CinemaService = require("../Services/CinemaService");

/* ==========================================================
   GET ALL CINEMAS (PUBLIC)
========================================================== */
exports.getAllCinemas = async (req, res) => {
    try {
        const cinemas = await CinemaService.getAllCinemas();

        return res.status(200).json(cinemas);
    } catch (err) {
        console.error("getAllCinemas error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET CINEMA BY ID
========================================================== */
exports.getCinemaById = async (req, res) => {
    try {
        const { cinema_id } = req.params;

        const cinema = await CinemaService.getCinemaById(cinema_id);

        return res.status(200).json(cinema);
    } catch (err) {
        console.error("getCinemaById error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET CINEMA BY SLUG
========================================================== */
exports.getCinemaBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const cinema = await CinemaService.getCinemaBySlug(slug);

        return res.status(200).json(cinema);
    } catch (err) {
        console.error("getCinemaBySlug error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   CREATE CINEMA
========================================================== */
exports.createCinema = async (req, res) => {
    try {
        const cinemaId = await CinemaService.createCinema(req.body);

        return res.status(201).json({
            success: true,
            message: "Thêm rạp thành công!",
            data: {
                cinema_id: cinemaId
            }
        });
    } catch (err) {
        console.error("createCinema error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   UPDATE CINEMA
========================================================== */
exports.updateCinema = async (req, res) => {
    try {
        const { cinema_id } = req.params;

        await CinemaService.updateCinema(
            cinema_id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật rạp thành công!"
        });
    } catch (err) {
        console.error("updateCinema error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   DELETE CINEMA
========================================================== */
exports.deleteCinema = async (req, res) => {
    try {
        const { cinema_id } = req.params;

        await CinemaService.deleteCinema(cinema_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa rạp thành công."
        });
    } catch (err) {
        console.error("deleteCinema error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
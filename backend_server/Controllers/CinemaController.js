
const CinemaService = require("../Services/CinemaService");

// ==========================================================
// PUBLIC / ADMIN - GET ALL CINEMAS
// KHÔNG PHÂN TRANG
// ==========================================================
exports.getAllCinemasAll = async (req, res) => {
    try {
        const {
            search = "",
            page,
            limit
        } = req.query;

        // Không cho phép phân trang ở route này
        if (
            page !== undefined ||
            limit !== undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Route /api/cinemas không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/cinemas/paginated để phân trang."
            });
        }

        const data =
            await CinemaService.getAllCinemasAll(
                search
            );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (err) {
        console.error(
            "Get All Cinemas Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - GET CINEMAS WITH PAGINATION
// ==========================================================
exports.getCinemasWithPagination = async (
    req,
    res
) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = ""
        } = req.query;

        const data =
            await CinemaService.getAllCinemasPaginated(
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
            "Get Cinemas Paginated Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - GET CINEMA BY ID
// ==========================================================
exports.getCinemaById = async (
    req,
    res
) => {
    try {
        const {
            cinema_id
        } = req.params;

        const cinema =
            await CinemaService.getCinemaById(
                cinema_id
            );

        return res.status(200).json({
            success: true,
            data: cinema
        });

    } catch (err) {
        console.error(
            "Get Cinema By ID Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// PUBLIC - GET CINEMA BY SLUG
// ==========================================================
exports.getCinemaBySlug = async (
    req,
    res
) => {
    try {
        const {
            slug
        } = req.params;

        const cinema =
            await CinemaService.getCinemaBySlug(
                slug
            );

        return res.status(200).json({
            success: true,
            data: cinema
        });

    } catch (err) {
        console.error(
            "Get Cinema By Slug Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - CREATE CINEMA
// ==========================================================
exports.createCinema = async (
    req,
    res
) => {
    try {
        const cinemaId =
            await CinemaService.createCinema(
                req.body
            );

        return res.status(201).json({
            success: true,
            message:
                "Thêm rạp thành công!",
            data: {
                cinema_id: cinemaId
            }
        });

    } catch (err) {
        console.error(
            "Create Cinema Error:",
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - UPDATE CINEMA
// ==========================================================
exports.updateCinema = async (
    req,
    res
) => {
    try {
        const {
            cinema_id
        } = req.params;

        await CinemaService.updateCinema(
            cinema_id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật rạp thành công!"
        });

    } catch (err) {
        console.error(
            "Update Cinema Error:",
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};

// ==========================================================
// ADMIN - DELETE CINEMA
// ==========================================================
exports.deleteCinema = async (
    req,
    res
) => {
    try {
        const {
            cinema_id
        } = req.params;

        await CinemaService.deleteCinema(
            cinema_id
        );

        return res.status(200).json({
            success: true,
            message:
                "Đã xóa rạp thành công."
        });

    } catch (err) {
        console.error(
            "Delete Cinema Error:",
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Lỗi máy chủ"
        });
    }
};


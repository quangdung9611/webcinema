
// controllers/NewsController.js

const NewsService = require("../Services/NewsService");


/* ==========================================================
    PUBLIC - GET ALL NEWS (KHÔNG PHÂN TRANG)
========================================================== */
exports.getAllNewsAll = async (req, res) => {

    try {

        const {
            search = "",
            page,
            limit
        } = req.query;


        // /api/news không hỗ trợ page / limit
        if (
            page !== undefined ||
            limit !== undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Route /api/news không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/news/paginated để phân trang."

            });
        }


        // Service trả trực tiếp array
        const data =
            await NewsService.getAllNewsAll(
                search
            );


        return res.status(200).json({

            success: true,

            data

        });

    } catch (err) {

        console.error(
            "Get All News Error:",
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


/* ==========================================================
    ADMIN - GET NEWS WITH PAGINATION
========================================================== */
exports.getNewsWithPagination = async (
    req,
    res
) => {

    try {

        const {
            page = 1,
            limit = 20,
            search = ""
        } = req.query;


        const result =
            await NewsService.getAllNewsAdmin(
                page,
                limit,
                search
            );


        /*
            Service:

            {
                data: [],
                pagination: {}
            }

            Response:

            {
                success: true,
                data: [],
                pagination: {}
            }

            Không còn:
                data.data
        */

        return res.status(200).json({

            success: true,

            data:
                result.data,

            pagination:
                result.pagination

        });

    } catch (err) {

        console.error(
            "Get News Paginated Error:",
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


/* ==========================================================
    ADMIN - GET NEWS BY ID
========================================================== */
exports.getNewsById = async (
    req,
    res
) => {

    try {

        const {
            news_id
        } = req.params;


        const news =
            await NewsService.getNewsById(
                news_id
            );


        return res.status(200).json({

            success: true,

            data: news

        });

    } catch (err) {

        console.error(
            "getNewsById error:",
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


/* ==========================================================
    PUBLIC - GET NEWS BY SLUG
========================================================== */
exports.getNewsBySlug = async (
    req,
    res
) => {

    try {

        const {
            slug
        } = req.params;


        const news =
            await NewsService.getNewsBySlug(
                slug
            );


        return res.status(200).json({

            success: true,

            data: news

        });

    } catch (err) {

        console.error(
            "getNewsBySlug error:",
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


/* ==========================================================
    ADMIN - CREATE NEWS
========================================================== */
exports.createNews = async (
    req,
    res
) => {

    try {

        const newsId =
            await NewsService.createNews(
                req.body,
                req.file
            );


        return res.status(201).json({

            success: true,

            message:
                "Thêm bài viết thành công!",

            data: {
                news_id: newsId
            }

        });

    } catch (err) {

        console.error(
            "createNews error:",
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


/* ==========================================================
    ADMIN - UPDATE NEWS
========================================================== */
exports.updateNews = async (
    req,
    res
) => {

    try {

        const {
            news_id
        } = req.params;


        await NewsService.updateNews(
            news_id,
            req.body,
            req.file
        );


        return res.status(200).json({

            success: true,

            message:
                "Cập nhật bài viết thành công!"

        });

    } catch (err) {

        console.error(
            "updateNews error:",
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


/* ==========================================================
    ADMIN - DELETE NEWS
========================================================== */
exports.deleteNews = async (
    req,
    res
) => {

    try {

        const {
            news_id
        } = req.params;


        await NewsService.deleteNews(
            news_id
        );


        return res.status(200).json({

            success: true,

            message:
                "Đã xóa bài viết thành công."

        });

    } catch (err) {

        console.error(
            "deleteNews error:",
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


/* ==========================================================
    PUBLIC - LIKE NEWS
========================================================== */
exports.likeNews = async (
    req,
    res
) => {

    try {

        const {
            news_id
        } = req.params;


        await NewsService.likeNews(
            news_id
        );


        return res.status(200).json({

            success: true,

            message:
                "Đã tăng lượt thích!"

        });

    } catch (err) {

        console.error(
            "likeNews error:",
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


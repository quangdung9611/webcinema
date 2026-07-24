const NewsService = require("../Services/NewsService");

/* ==========================================================
   GET ALL NEWS (PUBLIC)
========================================================== */
exports.getAllNews = async (req, res) => {
    try {
        const news = await NewsService.getAllNews();
        return res.status(200).json(news);
    } catch (err) {
        console.error("getAllNews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET ALL NEWS (ADMIN)
========================================================== */
exports.getAllNewsAdmin = async (req, res) => {
    try {
        const news = await NewsService.getAllNewsAdmin();
        return res.status(200).json(news);
    } catch (err) {
        console.error("getAllNewsAdmin error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET NEWS BY ID (ADMIN)
========================================================== */
exports.getNewsById = async (req, res) => {
    try {
        const { news_id } = req.params;
        const news = await NewsService.getNewsById(news_id);

        return res.status(200).json(news);
    } catch (err) {
        console.error("getNewsById error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET NEWS BY SLUG (PUBLIC)
========================================================== */
exports.getNewsBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const news = await NewsService.getNewsBySlug(slug);

        return res.status(200).json(news);
    } catch (err) {
        console.error("getNewsBySlug error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   CREATE NEWS (ADMIN)
========================================================== */
exports.createNews = async (req, res) => {
    try {
        const newsId = await NewsService.createNews(req.body, req.file);

        return res.status(201).json({
            success: true,
            message: "Thêm bài viết thành công!",
            data: {
                news_id: newsId
            }
        });
    } catch (err) {
        console.error("createNews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   UPDATE NEWS (ADMIN)
========================================================== */
exports.updateNews = async (req, res) => {
    try {
        const { news_id } = req.params;

        await NewsService.updateNews(news_id, req.body, req.file);

        return res.status(200).json({
            success: true,
            message: "Cập nhật bài viết thành công!"
        });
    } catch (err) {
        console.error("updateNews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   DELETE NEWS (ADMIN)
========================================================== */
exports.deleteNews = async (req, res) => {
    try {
        const { news_id } = req.params;

        await NewsService.deleteNews(news_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa bài viết thành công."
        });
    } catch (err) {
        console.error("deleteNews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   LIKE NEWS
========================================================== */
exports.likeNews = async (req, res) => {
    try {
        const { news_id } = req.params;

        await NewsService.likeNews(news_id);

        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt thích!"
        });
    } catch (err) {
        console.error("likeNews error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
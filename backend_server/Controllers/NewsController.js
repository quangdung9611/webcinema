// controllers/NewsController.js
const NewsService = require('../Services/NewsService');

/*=========================================================
    PUBLIC/ADMIN - GET ALL NEWS (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllNewsAll = async (req, res) => {
    try {
        const { search = '', page, limit } = req.query;

        // Không cho phép page/limit ở route này
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: 'Route /api/news không hỗ trợ page/limit. Vui lòng dùng /api/news/paginated'
            });
        }

        const data = await NewsService.getAllNewsAll(search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get All News Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    ADMIN - GET NEWS WITH PAGINATION
=========================================================*/
exports.getNewsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const result = await NewsService.getAllNewsPaginated(page, limit, search);
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error('Get News Paginated Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    ADMIN - GET NEWS BY ID
=========================================================*/
exports.getNewsById = async (req, res) => {
    try {
        const { news_id } = req.params;
        const news = await NewsService.getNewsById(news_id);
        return res.status(200).json({ success: true, data: news });
    } catch (err) {
        console.error('Get News By ID Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    PUBLIC - GET NEWS BY SLUG
=========================================================*/
exports.getNewsBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const news = await NewsService.getNewsBySlug(slug);
        return res.status(200).json({ success: true, data: news });
    } catch (err) {
        console.error('Get News By Slug Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    ADMIN - CREATE NEWS
=========================================================*/
exports.createNews = async (req, res) => {
    try {
        const newsId = await NewsService.createNews(req.body, req.files || {});
        return res.status(201).json({
            success: true,
            message: 'Thêm bài viết thành công!',
            data: { news_id: newsId }
        });
    } catch (err) {
        console.error('Create News Error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    ADMIN - UPDATE NEWS
=========================================================*/
exports.updateNews = async (req, res) => {
    try {
        const { news_id } = req.params;
        await NewsService.updateNews(news_id, req.body, req.files || {});
        return res.status(200).json({
            success: true,
            message: 'Cập nhật bài viết thành công!'
        });
    } catch (err) {
        console.error('Update News Error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    ADMIN - DELETE NEWS
=========================================================*/
exports.deleteNews = async (req, res) => {
    try {
        const { news_id } = req.params;
        await NewsService.deleteNews(news_id);
        return res.status(200).json({
            success: true,
            message: 'Đã xóa bài viết thành công.'
        });
    } catch (err) {
        console.error('Delete News Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

/*=========================================================
    PUBLIC - LIKE NEWS
=========================================================*/
exports.likeNews = async (req, res) => {
    try {
        const { news_id } = req.params;
        await NewsService.likeNews(news_id);
        return res.status(200).json({
            success: true,
            message: 'Đã tăng lượt thích!'
        });
    } catch (err) {
        console.error('Like News Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};
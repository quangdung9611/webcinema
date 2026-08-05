const PromotionService = require("../Services/PromotionService");

/* ==========================================================
    PUBLIC/ADMIN - GET ALL PROMOTIONS (KHÔNG PHÂN TRANG)
========================================================== */
exports.getAllPromotionsAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        // ⚠️ Nếu có page hoặc limit → từ chối yêu cầu, trả về 400
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/promotions không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/promotions/paginated để phân trang."
            });
        }

        const data = await PromotionService.getAllPromotionsAll(search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get All Promotions Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - GET PROMOTIONS WITH PAGINATION
========================================================== */
exports.getPromotionsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await PromotionService.getAllPromotionsPaginated(page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Promotions Paginated Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - GET PROMOTION BY ID
========================================================== */
exports.getPromotionById = async (req, res) => {
    try {
        const { promotion_id } = req.params;
        const promotion = await PromotionService.getPromotionById(promotion_id);
        return res.status(200).json({ success: true, data: promotion });
    } catch (err) {
        console.error("getPromotionById error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    PUBLIC - GET PROMOTION BY SLUG
========================================================== */
exports.getPromotionBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const promotion = await PromotionService.getPromotionBySlug(slug);
        return res.status(200).json({ success: true, data: promotion });
    } catch (err) {
        console.error("getPromotionBySlug error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - CREATE PROMOTION
========================================================== */
exports.createPromotion = async (req, res) => {
    try {
        const promotionId = await PromotionService.createPromotion(req.body, req.file);
        return res.status(201).json({
            success: true,
            message: "Thêm khuyến mãi thành công!",
            data: { promotion_id: promotionId }
        });
    } catch (err) {
        console.error("createPromotion error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - UPDATE PROMOTION
========================================================== */
exports.updatePromotion = async (req, res) => {
    try {
        const { promotion_id } = req.params;
        await PromotionService.updatePromotion(promotion_id, req.body, req.file);
        return res.status(200).json({
            success: true,
            message: "Cập nhật khuyến mãi thành công!"
        });
    } catch (err) {
        console.error("updatePromotion error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - DELETE PROMOTION
========================================================== */
exports.deletePromotion = async (req, res) => {
    try {
        const { promotion_id } = req.params;
        await PromotionService.deletePromotion(promotion_id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa khuyến mãi thành công."
        });
    } catch (err) {
        console.error("deletePromotion error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    PUBLIC - LIKE PROMOTION
========================================================== */
exports.increaseLike = async (req, res) => {
    try {
        const { promotion_id } = req.params;
        await PromotionService.likePromotion(promotion_id);
        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt thích!"
        });
    } catch (err) {
        console.error("increaseLike error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - TOGGLE PROMOTION STATUS
========================================================== */
exports.togglePromotionStatus = async (req, res) => {
    try {
        const { promotion_id } = req.params;
        const isActive = await PromotionService.toggleStatus(promotion_id);
        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái thành công!",
            data: { is_active: isActive }
        });
    } catch (err) {
        console.error("togglePromotionStatus error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
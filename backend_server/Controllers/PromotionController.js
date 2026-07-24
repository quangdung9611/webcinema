const PromotionService = require("../Services/PromotionService");

/* ==========================================================
   GET ALL PROMOTIONS (PUBLIC)
========================================================== */
exports.getAllPromotions = async (req, res) => {
    try {
        const promotions = await PromotionService.getAllPromotions(true);

        return res.status(200).json(promotions);
    } catch (err) {
        console.error("getAllPromotions error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET ALL PROMOTIONS (ADMIN)
========================================================== */
exports.getAllPromotionsAdmin = async (req, res) => {
    try {
        const promotions = await PromotionService.getAllPromotions(false);

        return res.status(200).json(promotions);
    } catch (err) {
        console.error("getAllPromotionsAdmin error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET PROMOTION BY ID (ADMIN)
========================================================== */
exports.getPromotionById = async (req, res) => {
    try {
        const { promotion_id } = req.params;

        const promotion = await PromotionService.getPromotionById(promotion_id);

        return res.status(200).json(promotion);
    } catch (err) {
        console.error("getPromotionById error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET PROMOTION BY SLUG (PUBLIC)
========================================================== */
exports.getPromotionBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const promotion = await PromotionService.getPromotionBySlug(slug);

        return res.status(200).json(promotion);
    } catch (err) {
        console.error("getPromotionBySlug error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   CREATE PROMOTION (ADMIN)
========================================================== */
exports.createPromotion = async (req, res) => {
    try {
        const promotionId = await PromotionService.createPromotion(
            req.body,
            req.file
        );

        return res.status(201).json({
            success: true,
            message: "Thêm khuyến mãi thành công!",
            data: {
                promotion_id: promotionId
            }
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
   UPDATE PROMOTION (ADMIN)
========================================================== */
exports.updatePromotion = async (req, res) => {
    try {
        const { promotion_id } = req.params;

        await PromotionService.updatePromotion(
            promotion_id,
            req.body,
            req.file
        );

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
   DELETE PROMOTION (ADMIN)
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
   LIKE PROMOTION
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
   TOGGLE PROMOTION STATUS (ADMIN)
========================================================== */
exports.togglePromotionStatus = async (req, res) => {
    try {
        const { promotion_id } = req.params;

        const isActive = await PromotionService.toggleStatus(promotion_id);

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái thành công!",
            is_active: isActive
        });
    } catch (err) {
        console.error("togglePromotionStatus error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
// routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const PromotionController = require('../Controllers/PromotionController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/*=========================================================
    PUBLIC ROUTES (không cần đăng nhập)
=========================================================*/
// Lấy toàn bộ khuyến mãi (không phân trang)
router.get('/', PromotionController.getAllPromotionsAll);

// Lấy chi tiết khuyến mãi theo SLUG
router.get('/detail/:slug', PromotionController.getPromotionBySlug);

// Tăng lượt thích
router.post('/like/:promotion_id', PromotionController.likePromotion);

/*=========================================================
    ADMIN - QUẢN LÝ KHUYẾN MÃI
=========================================================*/
// Lấy khuyến mãi có phân trang
router.get('/paginated', authenticateAdmin, PromotionController.getPromotionsWithPagination);

// Lấy chi tiết khuyến mãi theo ID (admin)
router.get('/:promotion_id', authenticateAdmin, PromotionController.getPromotionById);

// Tạo khuyến mãi mới
router.post(
    '/',
    authenticateAdmin,
    upload.fields([
        { name: 'promotion_image', maxCount: 1 },
        { name: 'promotion_backdrop', maxCount: 1 }
    ]),
    PromotionController.createPromotion
);

// Cập nhật khuyến mãi
router.put(
    '/:promotion_id',
    authenticateAdmin,
    upload.fields([
        { name: 'promotion_image', maxCount: 1 },
        { name: 'promotion_backdrop', maxCount: 1 }
    ]),
    PromotionController.updatePromotion
);

// Xóa khuyến mãi
router.delete('/:promotion_id', authenticateAdmin, PromotionController.deletePromotion);

// Toggle status (bật/tắt)
router.patch('/:promotion_id/toggle', authenticateAdmin, PromotionController.togglePromotionStatus);

module.exports = router;
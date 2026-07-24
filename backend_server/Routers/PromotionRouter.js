const express = require('express');
const router = express.Router();

const PromotionController = require('../Controllers/PromotionController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    PUBLIC ROUTES (Không cần auth - ai cũng xem được)
========================================================== */

// Lấy danh sách khuyến mãi (admin và khách đều xem được)
router.get('/', PromotionController.getAllPromotionsAdmin);

// Lấy danh sách khuyến mãi cho client (alias)
router.get('/all', PromotionController.getAllPromotions);

// Tăng lượt thích (public)
router.post('/like/:promotion_id', PromotionController.increaseLike);

// Lấy chi tiết khuyến mãi theo ID (public)
router.get('/:promotion_id', PromotionController.getPromotionById);

// Lấy chi tiết khuyến mãi theo slug (public) - ĐẶT CUỐI CÙNG
router.get('/:slug', PromotionController.getPromotionBySlug);

/* ==========================================================
    ADMIN ROUTES (Chỉ admin mới được thêm/sửa/xóa)
========================================================== */

// Tạo khuyến mãi mới (admin)
router.post('/', authenticateAdmin, upload.single('promotion_image'), PromotionController.createPromotion);

// Cập nhật khuyến mãi (admin)
router.put('/:promotion_id', authenticateAdmin, upload.single('promotion_image'), PromotionController.updatePromotion);

// Xóa khuyến mãi (admin)
router.delete('/:promotion_id', authenticateAdmin, PromotionController.deletePromotion);

module.exports = router;
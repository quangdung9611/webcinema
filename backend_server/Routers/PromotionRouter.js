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

// Lấy chi tiết khuyến mãi theo ID (ai cũng xem được)
router.get('/detail/:promotion_id', PromotionController.getPromotionById);

// Lấy danh sách khuyến mãi cho client (alias - có thể giữ hoặc bỏ)
router.get('/all', PromotionController.getAllPromotions);

// Tăng lượt thích (public)
router.post('/like/:id', PromotionController.increaseLike);

// Lấy chi tiết khuyến mãi theo slug (public)
router.get('/:slug', PromotionController.getPromotionBySlug);

/* ==========================================================
    ADMIN ROUTES (Chỉ admin mới được thêm/sửa/xóa)
========================================================== */

// Tạo khuyến mãi mới (admin)
router.post('/', authenticateAdmin, upload.single('promotion_image'), PromotionController.createPromotion);

// Cập nhật khuyến mãi (admin)
router.put('/update/:promotion_id', authenticateAdmin, upload.single('promotion_image'), PromotionController.updatePromotion);

// Xóa khuyến mãi (admin)
router.delete('/:promotion_id', authenticateAdmin, PromotionController.deletePromotion);

module.exports = router;
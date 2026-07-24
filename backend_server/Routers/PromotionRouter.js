const express = require('express');
const router = express.Router();

const PromotionController = require('../Controllers/PromotionController');

// ✅ Đã sửa: dùng MulterMiddleware thay vì UploadMiddleware cũ
const upload = require('../Middlewares/MulterMiddleware');

/* ==========================================================
    1. NHÓM ADMIN
========================================================== */

// Lấy toàn bộ promotions (admin)
router.get('/', PromotionController.getAllPromotionsAdmin);

// Lấy chi tiết promotion theo ID - ĐÃ SỬA: dùng promotion_id
router.get('/detail/:promotion_id', PromotionController.getPromotionById);

// Tạo promotion mới - field: promotion_image
router.post('/', upload.single('promotion_image'), PromotionController.createPromotion);

// Update promotion - ĐÃ SỬA: dùng promotion_id
router.put('/update/:promotion_id', upload.single('promotion_image'), PromotionController.updatePromotion);

// Delete promotion - ĐÃ SỬA: dùng promotion_id
router.delete('/:promotion_id', PromotionController.deletePromotion);

/* ==========================================================
    2. NHÓM PUBLIC (PHẢI ĐẶT CUỐI CÙNG)
========================================================== */

// Lấy danh sách promotions cho client
router.get('/all', PromotionController.getAllPromotions);

// Tăng like
router.post('/like/:id', PromotionController.increaseLike);

// ⚠️ Chi tiết theo slug - Đặt CUỐI CÙNG để không bị trùng với /all hoặc /detail/:id
router.get('/:slug', PromotionController.getPromotionBySlug);

module.exports = router;
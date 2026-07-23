const express = require('express');
const router = express.Router();

const PromotionController = require('../Controllers/PromotionController');
const upload = require('../Middlewares/UploadMiddleware');

/* ==========================================================
    1. NHÓM ADMIN
========================================================== */

// Lấy toàn bộ promotions (admin)
router.get('/', PromotionController.getAllPromotionsAdmin);

// Lấy chi tiết promotion theo ID
router.get('/detail/:id', PromotionController.getPromotionById);

// ✅ Tạo promotion mới - Đã sửa field name thành promotion_image
router.post('/', upload.single('promotion_image'), PromotionController.createPromotion);

// ✅ Update promotion - Đã sửa field name thành promotion_image
router.put('/update/:id', upload.single('promotion_image'), PromotionController.updatePromotion);

// Delete promotion
router.delete('/:id', PromotionController.deletePromotion);

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
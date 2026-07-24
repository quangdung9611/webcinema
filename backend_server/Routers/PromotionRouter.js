const express = require('express');
const router = express.Router();

const PromotionController = require('../Controllers/PromotionController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    1. NHÓM ADMIN (Cần quyền admin)
========================================================== */

router.get('/', authenticateAdmin, PromotionController.getAllPromotionsAdmin);
router.get('/detail/:promotion_id', authenticateAdmin, PromotionController.getPromotionById);
router.post('/', authenticateAdmin, upload.single('promotion_image'), PromotionController.createPromotion);
router.put('/update/:promotion_id', authenticateAdmin, upload.single('promotion_image'), PromotionController.updatePromotion);
router.delete('/:promotion_id', authenticateAdmin, PromotionController.deletePromotion);

/* ==========================================================
    2. NHÓM PUBLIC (Không cần auth)
========================================================== */

router.get('/all', PromotionController.getAllPromotions);
router.post('/like/:id', PromotionController.increaseLike);
router.get('/:slug', PromotionController.getPromotionBySlug);

module.exports = router;
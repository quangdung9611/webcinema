const express =
    require('express');

const router =
    express.Router();

const PromotionController =
    require(
        '../Controllers/PromotionController'
    );

const upload =
    require(
        '../Middlewares/UploadMiddleware'
    );

/* ==========================================================
    1. NHÓM ADMIN
========================================================== */

// Lấy toàn bộ promotions
router.get(
    '/',
    PromotionController
        .getAllPromotionsAdmin
);

// Lấy chi tiết promotion theo ID
router.get(
    '/detail/:id',
    PromotionController
        .getPromotionById
);

// Tạo promotion mới
// key upload: image_url
router.post(
    '/',
    upload.single(
        'image_url'
    ),
    PromotionController
        .createPromotion
);

// Update promotion
router.put(
    '/update/:id',
    upload.single(
        'image_url'
    ),
    PromotionController
        .updatePromotion
);

// Delete promotion
router.delete(
    '/:id',
    PromotionController
        .deletePromotion
);

/* ==========================================================
    2. NHÓM PUBLIC
========================================================== */

// Lấy danh sách promotions cho client
router.get(
    '/all',
    PromotionController
        .getAllPromotions
);

// Tăng like
router.post(
    '/like/:id',
    PromotionController
        .increaseLike
);

// Chi tiết theo slug
router.get(
    '/:slug',
    PromotionController
        .getPromotionBySlug
);

module.exports =
    router;
// routes/newsRoutes.js
const express = require('express');
const router = express.Router();

const NewsController = require('../Controllers/NewsController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
   PUBLIC ROUTES (không cần đăng nhập)
========================================================== */
// Lấy tất cả tin tức (không phân trang)
router.get('/', NewsController.getAllNewsAll);

// Tăng lượt thích
router.post('/like/:news_id', NewsController.likeNews);

// Chi tiết theo SLUG
router.get('/detail/:slug', NewsController.getNewsBySlug);

/* ==========================================================
   ADMIN ROUTES (cần quyền admin)
========================================================== */
// Có phân trang
router.get('/paginated', authenticateAdmin, NewsController.getNewsWithPagination);

// Lấy chi tiết theo ID (admin)
router.get('/:news_id', authenticateAdmin, NewsController.getNewsById);

// CRUD - hỗ trợ upload cả ảnh chính và backdrop
router.post(
    '/',
    authenticateAdmin,
    upload.fields([
        { name: 'news_image', maxCount: 1 },
        { name: 'news_backdrop', maxCount: 1 }
    ]),
    NewsController.createNews
);

router.put(
    '/:news_id',
    authenticateAdmin,
    upload.fields([
        { name: 'news_image', maxCount: 1 },
        { name: 'news_backdrop', maxCount: 1 }
    ]),
    NewsController.updateNews
);

router.delete(
    '/:news_id',
    authenticateAdmin,
    NewsController.deleteNews
);

module.exports = router;
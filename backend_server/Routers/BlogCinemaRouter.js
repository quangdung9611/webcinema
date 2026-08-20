// routes/blogCinemaRoutes.js
const express = require('express');
const router = express.Router();

const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* =========================================================
    PUBLIC ROUTES (không cần auth)
========================================================= */
// Lấy danh sách blog (không phân trang)
router.get('/', BlogCinemaController.getAllBlogsAll);

// Lấy chi tiết blog theo SLUG
router.get('/detail/:slug', BlogCinemaController.getBlogBySlug);

// Tăng lượt thích
router.post('/like/:blog_id', BlogCinemaController.increaseLike);

/* =========================================================
    ADMIN ROUTES (cần auth admin)
========================================================= */
// Lấy blog có phân trang
router.get('/paginated', authenticateAdmin, BlogCinemaController.getBlogsWithPagination);

// Lấy chi tiết blog theo ID (admin)
router.get('/:blog_id', authenticateAdmin, BlogCinemaController.getBlogById);

// Tạo blog mới
router.post(
    '/',
    authenticateAdmin,
    upload.fields([
        { name: 'blog_image', maxCount: 1 },
        { name: 'blog_backdrop', maxCount: 1 }
    ]),
    BlogCinemaController.createBlog
);

// Cập nhật blog
router.put(
    '/:blog_id',
    authenticateAdmin,
    upload.fields([
        { name: 'blog_image', maxCount: 1 },
        { name: 'blog_backdrop', maxCount: 1 }
    ]),
    BlogCinemaController.updateBlog
);

// Xóa blog
router.delete(
    '/:blog_id',
    authenticateAdmin,
    BlogCinemaController.deleteBlog
);

module.exports = router;
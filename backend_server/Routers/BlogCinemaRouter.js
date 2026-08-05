const express = require('express');
const router = express.Router();

const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy danh sách blog (không phân trang)
router.get('/', BlogCinemaController.getAllBlogsAll);

// Lấy chi tiết blog theo slug
router.get('/:slug', BlogCinemaController.getBlogBySlug);

// Tăng lượt thích
router.post('/like/:blog_id', BlogCinemaController.increaseLike);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy blog có phân trang
router.get('/paginated', authenticateAdmin, BlogCinemaController.getBlogsWithPagination);

// Lấy chi tiết blog theo ID
router.get('/:blog_id', authenticateAdmin, BlogCinemaController.getBlogById);

// Tạo blog mới
router.post(
    '/',
    authenticateAdmin,
    upload.single('blog_image'),
    BlogCinemaController.createBlog
);

// Cập nhật blog
router.put(
    '/:blog_id',
    authenticateAdmin,
    upload.single('blog_image'),
    BlogCinemaController.updateBlog
);

// Xóa blog
router.delete(
    '/:blog_id',
    authenticateAdmin,
    BlogCinemaController.deleteBlog
);

module.exports = router;
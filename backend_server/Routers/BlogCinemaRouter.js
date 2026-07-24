const express = require('express');
const router = express.Router();
const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================

// Lấy danh sách blog (ai cũng xem)
router.get('/', BlogCinemaController.getAllBlogsAdmin);

// Tăng lượt thích
router.post('/like/:blog_id', BlogCinemaController.increaseLike);

// ==========================================================
// ADMIN ROUTES (cần auth)
// ==========================================================

// Lấy chi tiết blog theo ID (admin) - đặt trước /:slug
router.get('/:blog_id', authenticateAdmin, BlogCinemaController.getBlogById);

// Tạo blog mới
router.post('/', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.createBlog);

// Cập nhật blog
router.put('/:blog_id', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.updateBlog);

// Xóa blog
router.delete('/:blog_id', authenticateAdmin, BlogCinemaController.deleteBlog);

// ==========================================================
// PUBLIC DETAIL (phải đặt CUỐI CÙNG)
// ==========================================================

// Lấy chi tiết blog theo slug (khách hàng xem)
router.get('/:slug', BlogCinemaController.getBlogBySlug);

module.exports = router;
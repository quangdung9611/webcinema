const express = require('express');
const router = express.Router();
const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// ==========================================================
// PUBLIC ROUTES (không cần auth - ai cũng xem được)
// ==========================================================

// Lấy danh sách blog (admin và khách đều xem được)
router.get('/', BlogCinemaController.getAllBlogsAdmin);

// Lấy chi tiết blog theo slug (public)
router.get('/:slug', BlogCinemaController.getBlogBySlug);

// Tăng lượt thích (public)
router.post('/like/:id', BlogCinemaController.increaseLike);

// ==========================================================
// ADMIN ROUTES (chỉ admin mới được thêm/sửa/xóa)
// ==========================================================

// Lấy chi tiết blog theo ID (admin - không bắt buộc, có thể dùng slug)
router.get('/admin/:id', authenticateAdmin, BlogCinemaController.getBlogById);

// Tạo blog mới (admin)
router.post('/', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.createBlog);

// Cập nhật blog (admin)
router.put('/:id', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.updateBlog);

// Xóa blog (admin)
router.delete('/:id', authenticateAdmin, BlogCinemaController.deleteBlog);

module.exports = router;
const express = require('express');
const router = express.Router();
const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================

router.get('/', BlogCinemaController.getAllBlogsAdmin);
router.get('/:slug', BlogCinemaController.getBlogBySlug);
router.post('/like/:blog_id', BlogCinemaController.increaseLike); // ✅ sửa

// ==========================================================
// ADMIN ROUTES (cần auth)
// ==========================================================

router.get('/admin/:blog_id', authenticateAdmin, BlogCinemaController.getBlogById); // ✅ sửa
router.post('/', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.createBlog);
router.put('/:blog_id', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.updateBlog); // ✅ sửa
router.delete('/:blog_id', authenticateAdmin, BlogCinemaController.deleteBlog); // ✅ sửa

module.exports = router;
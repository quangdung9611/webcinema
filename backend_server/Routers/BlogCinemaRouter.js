const express = require('express');
const router = express.Router();
const BlogCinemaController = require('../Controllers/BlogCinemaController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// ADMIN (có thể đặt riêng để tránh xung đột)
router.get('/admin', authenticateAdmin, BlogCinemaController.getAllBlogsAdmin);
router.get('/admin/:id', authenticateAdmin, BlogCinemaController.getBlogById);
router.post('/admin', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.createBlog);
router.put('/admin/:id', authenticateAdmin, upload.single('blog_image'), BlogCinemaController.updateBlog);
router.delete('/admin/:id', authenticateAdmin, BlogCinemaController.deleteBlog);

// PUBLIC (phải đặt sau admin routes)
router.get('/all', BlogCinemaController.getAllBlogs);
router.post('/like/:id', BlogCinemaController.increaseLike);
router.get('/:slug', BlogCinemaController.getBlogBySlug); // phải cuối cùng

module.exports = router;
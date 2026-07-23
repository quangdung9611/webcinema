const express = require('express');
const router = express.Router();

const BlogCinemaController = require('../Controllers/BlogCinemaController');

// ✅ Đã sửa: dùng MulterMiddleware thay vì UploadMiddleware cũ
const upload = require('../Middlewares/MulterMiddleware');

/* ==========================================================
    1. NHÓM ADMIN
========================================================== */

// Lấy toàn bộ blog
router.get('/', BlogCinemaController.getAllBlogsAdmin);

// Lấy chi tiết blog theo ID
router.get('/detail/:id', BlogCinemaController.getBlogById);

// ✅ Tạo blog mới - field: blog_image
router.post('/', upload.single('blog_image'), BlogCinemaController.createBlog);

// ✅ Update blog - field: blog_image
router.put('/update/:id', upload.single('blog_image'), BlogCinemaController.updateBlog);

// Delete blog
router.delete('/:id', BlogCinemaController.deleteBlog);

/* ==========================================================
    2. NHÓM PUBLIC (PHẢI ĐẶT CUỐI CÙNG)
========================================================== */

// Lấy danh sách blog client
router.get('/all', BlogCinemaController.getAllBlogs);

// Like blog
router.post('/like/:id', BlogCinemaController.increaseLike);

// ⚠️ Chi tiết blog theo slug - Đặt CUỐI CÙNG để không bị trùng với /all hoặc /detail/:id
router.get('/:slug', BlogCinemaController.getBlogBySlug);

module.exports = router;
const express =
    require('express');

const router =
    express.Router();

const BlogCinemaController =
    require(
        '../Controllers/BlogCinemaController'
    );

const upload =
    require(
        '../Middlewares/UploadMiddleware'
    );

/* ==========================================================
    1. NHÓM ADMIN
========================================================== */

// Lấy toàn bộ blog
router.get(
    '/',
    BlogCinemaController
        .getAllBlogsAdmin
);

// Lấy chi tiết blog theo ID
router.get(
    '/detail/:id',
    BlogCinemaController
        .getBlogById
);

// Tạo blog mới
// key upload: image
router.post(
    '/',
    upload.single(
        'image'
    ),
    BlogCinemaController
        .createBlog
);

// Update blog
router.put(
    '/update/:id',
    upload.single(
        'image'
    ),
    BlogCinemaController
        .updateBlog
);

// Delete blog
router.delete(
    '/:id',
    BlogCinemaController
        .deleteBlog
);

/* ==========================================================
    2. NHÓM PUBLIC
========================================================== */

// Lấy danh sách blog client
router.get(
    '/all',
    BlogCinemaController
        .getAllBlogs
);

// Like blog
router.post(
    '/like/:id',
    BlogCinemaController
        .increaseLike
);

// Chi tiết blog theo slug
router.get(
    '/:slug',
    BlogCinemaController
        .getBlogBySlug
);

module.exports =
    router;
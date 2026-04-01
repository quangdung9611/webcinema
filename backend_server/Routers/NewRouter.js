const express = require('express');
const router = express.Router();
const NewsController = require('../Controllers/NewsController');
const upload = require('../Middlewares/UploadMiddleware'); 

/* ==========================================================
    1. NHÓM ADMIN (Lấy danh sách tổng & Quản lý)
   ========================================================== */

// Lấy TOÀN BỘ danh sách bài viết (Admin gọi GET /api/news)
router.get('/', NewsController.getAllNewsAdmin);

// Lấy chi tiết bài viết theo ID để đổ vào form Update
router.get('/detail/:id', NewsController.getNewsById); 

// Thêm mới bài viết (Dùng key: newsImage)
router.post('/', upload.single('newsImage'), NewsController.createNews);

// Cập nhật bài viết
router.put('/update/:news_id', upload.single('newsImage'), NewsController.updateNews);

// Xóa bài viết
router.delete('/:id', NewsController.deleteNews);


/* ==========================================================
    2. NHÓM PUBLIC (User xem tin tức)
   ========================================================== */

// Lấy danh sách tin tức cho Client (Dữ liệu đã được cắt ngắn nội dung)
// GET /api/news/all
router.get('/all', NewsController.getAllNews);

// Tăng lượt thích (Bấm nút Like)
router.post('/like/:id', NewsController.increaseLike);

// Xem chi tiết tin tức qua Slug
// Đặt ở cuối để tránh tranh chấp với các route /all hay /detail
router.get('/:slug', NewsController.getNewsBySlug);

module.exports = router;
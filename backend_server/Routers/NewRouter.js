const express = require('express');
const router = express.Router();
const NewsController = require('../Controllers/NewsController');

// ✅ Đã sửa: dùng MulterMiddleware thay vì UploadMiddleware cũ
const upload = require('../Middlewares/MulterMiddleware');

/* ==========================================================
    1. NHÓM ADMIN (Lấy danh sách tổng & Quản lý)
   ========================================================== */

// Lấy TOÀN BỘ danh sách bài viết (Admin gọi GET /api/news)
router.get('/', NewsController.getAllNewsAdmin);

// Lấy chi tiết bài viết theo ID để đổ vào form Update
router.get('/detail/:id', NewsController.getNewsById);

// Thêm mới bài viết - field: news_image
router.post('/', upload.single('news_image'), NewsController.createNews);

// Cập nhật bài viết - field: news_image
router.put('/update/:news_id', upload.single('news_image'), NewsController.updateNews);

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
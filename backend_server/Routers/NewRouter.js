const express = require('express');
const router = express.Router();
const NewsController = require('../Controllers/NewsController');
const upload = require('../Middlewares/UploadMiddleware'); 

/* ==========================================================
    1. NHÓM ADMIN (Cần xử lý Upload File)
   ========================================================== */

// Thêm mới bài viết (Dùng key: newsImage)
router.post('/', upload.single('newsImage'), NewsController.createNews);

// Lấy chi tiết bài viết theo ID để đổ vào form Update
router.get('/detail/:id', NewsController.getNewsById); 

// Cập nhật bài viết (Phải có upload.single để xử lý nếu admin chọn ảnh mới)
router.put('/update/:news_id', upload.single('newsImage'), NewsController.updateNews);

// Xóa bài viết
router.delete('/:id', NewsController.deleteNews);


/* ==========================================================
    2. NHÓM PUBLIC (User xem tin tức)
   ========================================================== */

// Lấy danh sách toàn bộ tin tức
router.get('/', NewsController.getAllNews);

// Xem chi tiết tin tức qua Slug (URL thân thiện)
router.get('/:slug', NewsController.getNewsBySlug);

module.exports = router;
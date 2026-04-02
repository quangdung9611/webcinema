const express = require('express');
const router = express.Router();
const movieController = require('../Controllers/MovieController'); 
const upload = require('../Middlewares/UploadMiddleware'); 

// --- CÁC ROUTE CHO PHIM ---

// 1. Lấy phim theo nhóm (Cho Mega Menu - 4 phim mỗi bên)
router.get('/status-group', movieController.getMoviesByStatusGroup);

// 2. Lấy danh sách phim theo trang Category
router.get('/category/:statusSlug', movieController.getMoviesByStatusSlug);

// 3. Lấy tất cả phim (Cho trang danh sách Admin)
router.get('/', movieController.getAllMovies);

// --- CÁC ROUTE TƯƠNG TÁC (LIKE & VIEW) ---
// Route tăng lượt thích
router.patch('/like/:id', movieController.likeMovie);

// Route tăng lượt xem (Gọi khi khách vào xem chi tiết phim)
router.patch('/view/:id', movieController.incrementViews);


// 4. Các route Admin 
// SỬA TẠI ĐÂY: Dùng upload.fields để nhận cùng lúc 2 loại ảnh khác nhau
router.post('/add', upload.fields([
    { name: 'posters', maxCount: 1 }, 
    { name: 'backdrop_url', maxCount: 1 }
]), movieController.addMovie);

router.put('/update/:id', upload.fields([
    { name: 'posters', maxCount: 1 }, 
    { name: 'backdrop_url', maxCount: 1 }
]), movieController.updateMovie);

router.delete('/:id', movieController.deleteMovie);
router.get('/detail/:id', movieController.getMovieById);

// 5. Lấy 1 phim THEO SLUG (Dành cho trang Chi tiết)
router.get('/:slug', movieController.getMovieBySlug);

module.exports = router;
const express = require('express');
const router = express.Router();
const movieController = require('../Controllers/MovieController'); 
const upload = require('../Middlewares/UploadMiddleware'); 

// --- CÁC ROUTE CHO PHIM ---

// 1. Lấy phim theo nhóm (Cho Mega Menu - 4 phim mỗi bên)
router.get('/status-group', movieController.getMoviesByStatusGroup);

// 2. Lấy danh sách phim theo trang Category (Đồng bộ với localhost:5173/movies/...)
// Sửa thành /category/ để phân biệt rõ với phim lẻ
router.get('/category/:statusSlug', movieController.getMoviesByStatusSlug);

// 3. Lấy tất cả phim (Cho trang danh sách Admin)
router.get('/', movieController.getAllMovies);

// 4. Các route Admin
router.post('/add', upload.single('posters'), movieController.addMovie);
router.put('/update/:id', upload.single('posters'), movieController.updateMovie);
router.delete('/:id', movieController.deleteMovie);
router.get('/detail/:id', movieController.getMovieById);

// 5. Lấy 1 phim THEO SLUG (Dành cho trang Chi tiết - Ví dụ: /lat-mat-7)
// PHẢI LUÔN ĐỂ CUỐI CÙNG
router.get('/:slug', movieController.getMovieBySlug);

module.exports = router;
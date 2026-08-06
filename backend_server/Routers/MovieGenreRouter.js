const express = require('express');
const router = express.Router();
const movieGenreController = require('../Controllers/MovieGenreController');

// ⚠️ QUAN TRỌNG: Route cụ thể phải đặt TRƯỚC route động (:movie_id)

// 1. Lấy toàn bộ gán thể loại cho tất cả phim
router.get('/all', movieGenreController.getAllAssignments);

// 2. Lấy genre_ids của 1 phim cụ thể
router.get('/:movie_id', movieGenreController.getGenresByMovieId);

// 3. Cập nhật thể loại cho phim (xóa cũ + thêm mới)
router.post('/update', movieGenreController.updateMovieGenres);

module.exports = router;
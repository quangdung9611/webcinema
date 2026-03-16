const express = require('express');
const router = express.Router();
const movieGenreController = require('../Controllers/MovieGenreController');

// 1. Route lấy TẤT CẢ các gán thể loại (Để hiện checkbox cho toàn bộ danh sách Admin)
// Quan trọng: Đặt cái này TRÊN cái /:movie_id để Express không nhầm "all-assignments" là một cái ID
router.get('/all-assignments', movieGenreController.getAllAssignments);

// 2. Route lấy danh sách thể loại của DUY NHẤT 1 phim (nếu cần dùng riêng)
router.get('/:movie_id', movieGenreController.getGenresByMovieId);

// 3. Route cập nhật (Xóa cũ - Thêm mới)
router.post('/update', movieGenreController.updateMovieGenres);

module.exports = router;
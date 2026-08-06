const express = require('express');
const router = express.Router();
const movieGenreController = require('../Controllers/MovieGenreController');

// ⚠️ QUAN TRỌNG: Đặt route cụ thể trước route động
router.get('/', movieGenreController.getAllAssignments);        // Lấy tất cả
router.get('/:movie_id', movieGenreController.getGenresByMovieId); // Lấy 1 phim
router.post('/update', movieGenreController.updateMovieGenres);    // Cập nhật

module.exports = router;
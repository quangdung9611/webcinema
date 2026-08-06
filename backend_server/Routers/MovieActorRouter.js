const express = require('express');
const router = express.Router();
const movieActorController = require('../Controllers/MovieActorController');

// ⚠️ QUAN TRỌNG: Route cụ thể đặt TRƯỚC route động

// 1. Lấy tất cả gán phim-diễn viên
router.get('/', movieActorController.getAllAssignments);

// 2. Lấy actor_ids của 1 phim cụ thể
router.get('/:movie_id', movieActorController.getActorsByMovieId);

// 3. Cập nhật danh sách diễn viên cho phim
router.post('/update', movieActorController.updateMovieActors);

module.exports = router;
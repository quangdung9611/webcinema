const express = require('express');
const router = express.Router();
const movieActorController = require('../Controllers/MovieActorController');

// 1. Route lấy TẤT CẢ các gán diễn viên (Để hiện cho danh sách Admin)
// Đặt cái này TRÊN cùng để tránh bị nhầm lẫn với tham số :movie_id
router.get('/all-assignments', movieActorController.getAllAssignments);

// 2. Route lấy danh sách ID diễn viên của DUY NHẤT 1 phim
router.get('/:movie_id', movieActorController.getActorsByMovieId);

// 3. Route cập nhật (Xóa cũ - Thêm mới)
router.post('/update', movieActorController.updateMovieActors);

module.exports = router;
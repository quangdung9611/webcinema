const express = require('express');
const router = express.Router();
const genreController = require('../Controllers/GenreController');

/**
 * ==========================================
 * CÁC ĐƯỜNG DẪN (ROUTES) CHO QUẢN LÝ THỂ LOẠI
 * (Đã đồng bộ cấu trúc với User & Cinema)
 * ==========================================
 */

// 1. Lấy danh sách toàn bộ thể loại
// GET: https://webcinema-zb8z.onrender.com/api/genres/
router.get('/', genreController.getAllGenres);

// 2. Thêm thể loại mới
// POST: https://webcinema-zb8z.onrender.com/api/genres/add
router.post('/add', genreController.addGenre);

// 3. Cập nhật thể loại theo ID
// PUT: https://webcinema-zb8z.onrender.com/api/genres/update/:genre_id
router.put('/update/:genre_id', genreController.updateGenre);

// 4. Xóa thể loại theo ID
// DELETE: https://webcinema-zb8z.onrender.com/api/genres/delete/:genre_id
router.delete('/delete/:genre_id', genreController.deleteGenre);

// 5. Lấy chi tiết thể loại theo ID (Dùng để đổ dữ liệu vào form Update)
// GET: https://webcinema-zb8z.onrender.com/api/genres/:genre_id
// Lưu ý: Đặt cuối cùng để tránh xung đột với các route tĩnh như /add
router.get('/:genre_id', genreController.getGenreById);

module.exports = router;
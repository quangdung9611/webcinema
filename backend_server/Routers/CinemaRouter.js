const express = require('express');
const router = express.Router();
const cinemaController = require('../Controllers/CinemaController');

// 1. Lấy danh sách tất cả các rạp
router.get('/', cinemaController.getAllCinemas);

// 2. Thêm rạp mới
router.post('/add', cinemaController.createCinema);

// 3. Cập nhật thông tin rạp theo ID
router.put('/update/:cinema_id', cinemaController.updateCinema);

// 4. Xóa rạp theo ID
router.delete('/delete/:cinema_id', cinemaController.deleteCinema);

// 5. Lấy chi tiết rạp theo ID (Dùng cho Admin Update)
// Đổi một chút để tránh trùng lặp hoàn toàn với slug
router.get('/id/:cinema_id', cinemaController.getCinemaById);

// 6. Lấy chi tiết rạp theo Slug (Dùng cho người dùng)
// GIỮ NGUYÊN THEO Ý DŨNG: https://api.quangdungcinema.id.vn/api/cinemas/:slug
router.get('/:slug', cinemaController.getCinemaBySlug);

module.exports = router;
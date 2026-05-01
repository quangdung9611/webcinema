const express = require('express');
const router = express.Router();
const showtimeController = require('../Controllers/ShowTimeController');

/**
 * ==========================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) SUẤT CHIẾU
 * ==========================================
 */

// 1. Lấy danh sách tất cả suất chiếu (Dùng cho bảng quản lý Admin)
// GET: https://api.quangdungcinema.id.vn/api/showtimes/
router.get('/', showtimeController.getAllShowtimes);

// Đặt dòng này lên TRÊN các route có tham số như /detail/:id để tránh bị nhận nhầm nhé
router.get('/filter', showtimeController.filterShowtimes);
// 2. Lấy chi tiết một suất chiếu (Dùng để đổ dữ liệu vào Form Update)
// GET: https://api.quangdungcinema.id.vn/api/showtimes/detail/:id
router.get('/detail/:id', showtimeController.getShowtimeDetail);

// 3. Thêm mới suất chiếu
// POST: https://api.quangdungcinema.id.vn/api/showtimes/add
router.post('/add', showtimeController.createShowtime);

// 4. Cập nhật suất chiếu theo ID
// PUT: https://api.quangdungcinema.id.vn/api/showtimes/update/:id
router.put('/update/:id', showtimeController.updateShowtime);

// 5. Xóa suất chiếu theo ID
// DELETE: https://api.quangdungcinema.id.vn/api/showtimes/delete/:id
router.delete('/delete/:id', showtimeController.deleteShowtime);

// 6. Lấy suất chiếu theo phim (Dùng cho giao diện người dùng/Client)
// GET: https://api.quangdungcinema.id.vn/api/showtimes/movie/:movieId
router.get('/movie/:movieId', showtimeController.getShowtimesByMovie);

module.exports = router;
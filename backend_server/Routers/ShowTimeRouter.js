const express = require('express');
const router = express.Router();
const showtimeController = require('../Controllers/ShowTimeController');

/**
 * ==========================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) SUẤT CHIẾU
 * ==========================================
 */

// 1. Lấy danh sách tất cả suất chiếu (Dùng cho bảng quản lý Admin)
// GET: https://webcinema-zb8z.onrender.com/api/showtimes/
router.get('/', showtimeController.getAllShowtimes);

// 2. Lấy chi tiết một suất chiếu (Dùng để đổ dữ liệu vào Form Update)
// GET: https://webcinema-zb8z.onrender.com/api/showtimes/detail/:id
router.get('/detail/:id', showtimeController.getShowtimeDetail);

// 3. Thêm mới suất chiếu
// POST: https://webcinema-zb8z.onrender.com/api/showtimes/add
router.post('/add', showtimeController.createShowtime);

// 4. Cập nhật suất chiếu theo ID
// PUT: https://webcinema-zb8z.onrender.com/api/showtimes/update/:id
router.put('/update/:id', showtimeController.updateShowtime);

// 5. Xóa suất chiếu theo ID
// DELETE: https://webcinema-zb8z.onrender.com/api/showtimes/delete/:id
router.delete('/delete/:id', showtimeController.deleteShowtime);

// 6. Lấy suất chiếu theo phim (Dùng cho giao diện người dùng/Client)
// GET: https://webcinema-zb8z.onrender.com/api/showtimes/movie/:movieId
router.get('/movie/:movieId', showtimeController.getShowtimesByMovie);

module.exports = router;
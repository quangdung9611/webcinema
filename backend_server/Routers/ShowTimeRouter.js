const express = require('express');
const router = express.Router();
const showtimeController = require('../Controllers/ShowTimeController');

/**
 * ==========================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) SUẤT CHIẾU
 * ==========================================
 */

// 1. Lấy danh sách tất cả suất chiếu (Dùng cho bảng quản lý Admin)
router.get('/', showtimeController.getAllShowtimes);

// 2. ROUTE MỚI: Đặt vé nhanh (Dùng cho thanh Quick Booking ở trang chủ)
// GET: https://api.quangdungcinema.id.vn/api/showtimes/quick-booking
// Route này dùng Query Params nên để trên các route có :id
router.get('/quick-booking', showtimeController.getQuickBookingData);

// 3. Lấy chi tiết một suất chiếu
router.get('/detail/:id', showtimeController.getShowtimeDetail);

// 4. Thêm mới suất chiếu
router.post('/add', showtimeController.createShowtime);

// 5. Cập nhật suất chiếu theo ID
router.put('/update/:id', showtimeController.updateShowtime);

// 6. Xóa suất chiếu theo ID
router.delete('/delete/:id', showtimeController.deleteShowtime);

// 7. Lấy suất chiếu theo phim (Dùng cho giao diện người dùng/Client)
router.get('/movie/:movieId', showtimeController.getShowtimesByMovie);

// 8. Route lọc cũ (nếu Dũng vẫn muốn giữ lại cho mục đích khác)
router.get('/filter-legacy', showtimeController.filterShowtimes);

module.exports = router;
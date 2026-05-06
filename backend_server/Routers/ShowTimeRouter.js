const express = require('express');
const router = express.Router();
const showtimeController = require('../Controllers/ShowTimeController');

/**
 * ==========================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) SUẤT CHIẾU
 * ==========================================
 */

// 1. Lấy danh sách tất cả suất chiếu (Admin)
router.get('/', showtimeController.getAllShowtimes);

// 2. Đặt vé nhanh (Trang chủ)
router.get('/quick-booking', showtimeController.getQuickBookingData);

// 3. MỚI: Lọc suất chiếu cho trang Booking (Phim đã có sẵn, lọc theo Rạp + Ngày)
// GET: https://api.quangdungcinema.id.vn/api/showtimes/filter-booking
router.get('/filter-booking', showtimeController.getShowtimesForBooking);

// 4. Lấy chi tiết một suất chiếu
router.get('/detail/:id', showtimeController.getShowtimeDetail);

// 5. Thêm mới suất chiếu
router.post('/add', showtimeController.createShowtime);

// 6. Cập nhật suất chiếu theo ID
router.put('/update/:id', showtimeController.updateShowtime);

// 7. Xóa suất chiếu theo ID
router.delete('/delete/:id', showtimeController.deleteShowtime);

// 8. Lấy suất chiếu theo phim (Client - Movie Detail)
router.get('/movie/:movieId', showtimeController.getShowtimesByMovie);

// 9. Route lọc cũ
router.get('/filter-legacy', showtimeController.filterShowtimes);

module.exports = router;
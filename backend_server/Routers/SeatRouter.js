const express = require('express');
const router = express.Router();
const seatController = require('../Controllers/SeatController');

// ==========================================
// 1. QUẢN LÝ GHẾ CHO NGƯỜI DÙNG
// ==========================================

/**
 * Lấy sơ đồ ghế theo Suất chiếu
 * Logic mới: Chỉ hiển thị Available hoặc Booked (đã thanh toán)
 * GET: http://localhost:5000/api/seats/showtime/:showtimeId
 */
router.get('/showtime/:showtimeId', seatController.getSeatMapByShowtime);


// ==========================================
// 2. QUẢN LÝ CẤU TRÚC PHÒNG (Dành cho Admin)
// ==========================================

/**
 * Khởi tạo "Phôi" ghế cho phòng (Static Layout)
 */
router.post('/init', seatController.initRoomSeats);

/**
 * Xóa sạch cấu trúc ghế của một phòng
 */
router.delete('/room/:roomId', seatController.deleteSeatsByRoom);

/**
 * Lấy danh sách ghế tĩnh theo phòng (Admin xem cấu trúc)
 */
if (seatController.getSeatsByRoom) {
    router.get('/room/:roomId', seatController.getSeatsByRoom);
}

/**
 * Cập nhật trạng thái bảo trì ghế (Khóa/Mở ghế hỏng)
 */
router.put('/toggle-active', seatController.toggleSeatActive);

/**
 * Cập nhật loại ghế và giá thủ công
 */
router.put('/update-type', seatController.updateSeatTypeAndPrice);

module.exports = router;
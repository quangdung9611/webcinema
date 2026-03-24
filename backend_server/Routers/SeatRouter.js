const express = require('express');
const router = express.Router();
const seatController = require('../Controllers/SeatController');

// ==========================================
// 1. DÀNH CHO NGƯỜI DÙNG (CLIENT)
// ==========================================

/**
 * Lấy sơ đồ ghế theo Suất chiếu (Dynamic - Chứa trạng thái Booked/Available)
 * GET: /api/seats/showtime/:showtimeId
 */
router.get('/showtime/:showtimeId', seatController.getSeatMapByShowtime);


// ==========================================
// 2. DÀNH CHO QUẢN TRỊ (ADMIN)
// ==========================================

/**
 * Lấy danh sách ghế tĩnh theo phòng (Admin xem cấu trúc phôi)
 * Lưu ý: Tui đưa cái này lên trước DELETE để tránh bị nhầm route
 */
router.get('/room/:roomId', seatController.getSeatsByRoom);

/**
 * Khởi tạo "Phôi" ghế cho phòng (Tạo hàng loạt theo roomType)
 */
router.post('/init', seatController.initRoomSeats);

/**
 * Xóa sạch cấu trúc ghế của một phòng
 */
router.delete('/room/:roomId', seatController.deleteSeatsByRoom);

/**
 * Cập nhật trạng thái bảo trì ghế (Khóa/Mở ghế hỏng)
 */
router.put('/toggle-active', seatController.toggleSeatActive);

/**
 * Cập nhật loại ghế và giá thủ công (Sửa từng ghế)
 */
router.put('/update-type', seatController.updateSeatTypeAndPrice);

module.exports = router;
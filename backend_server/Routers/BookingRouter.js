const express = require('express');
const router = express.Router();
const bookingController = require('../Controllers/BookingController'); 

/**
 * ============================================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) CHO BOOKING - CINEMA STAR
 * ============================================================
 */

// 1. Lấy danh sách tất cả đơn hàng (Dùng cho bảng quản lý Admin)
// GET: http://localhost:5000/api/bookings/
router.get('/', bookingController.getAllBookings);

// 2. Lấy chi tiết một đơn hàng kèm theo bắp nước & ghế (Dùng cho Modal chi tiết)
// GET: http://localhost:5000/api/bookings/detail/:id
router.get('/detail/:id', bookingController.getBookingDetails);

// 3. Cập nhật trạng thái đơn hàng (Duyệt đơn/Hủy đơn)
// PUT: http://localhost:5000/api/bookings/update/:id/status
router.put('/update/:id/status', bookingController.updateBookingStatus);

// 4. Xóa đơn hàng theo ID
// DELETE: http://localhost:5000/api/bookings/delete/:id
// --- ĐÃ SỬA: Thay bookingController.deleteUser thành bookingController.deleteBooking ---
router.delete('/delete/:id', bookingController.deleteBooking); 

module.exports = router;
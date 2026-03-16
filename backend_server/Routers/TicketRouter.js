const express = require('express');
const router = express.Router();
const ticketController = require('../Controllers/TicketController');

// ==========================================
// 1. DÀNH CHO ADMIN (QUẢN TRỊ & SOÁT VÉ)
// ==========================================
router.get('/filter', ticketController.getFilteredShowtimes);
/**
 * Lấy toàn bộ danh sách vé
 */
router.get('/all', ticketController.getAllTickets);

/**
 * Lấy danh sách vé theo suất chiếu cụ thể (Dạng danh sách)
 */
router.get('/showtime/:showtimeId', ticketController.getTicketsByShowtime);

/**
 * [MỚI]: Lấy sơ đồ ghế đồ họa cho Admin
 * Trả về toàn bộ ghế trong phòng + thông tin vé/tên khách để render màu sắc
 */
router.get('/admin-map/:showtimeId', ticketController.getTicketSeatMap); // <-- THÊM DÒNG NÀY ĐÂY DŨNG

/**
 * Xử lý soát vé (Check-in)
 * Body: { ticketCode }
 */
router.post('/check-in', ticketController.checkInTicket);


// ==========================================
// 2. DÀNH CHO KHÁCH HÀNG & HIỂN THỊ
// ==========================================

/**
 * Lấy hình ảnh mã QR từ mã vé
 */
router.get('/qr/:ticketCode', ticketController.getTicketQR);

module.exports = router;
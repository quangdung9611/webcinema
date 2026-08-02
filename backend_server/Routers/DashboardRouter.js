const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// ================================================================
// DASHBOARD OVERVIEW
// ================================================================

// Tổng quan KPI
router.get('/stats', DashboardController.getStats);

// Tổng hợp nhanh cho trang chủ Admin
router.get('/summary', DashboardController.getSummary);

// 5 đơn hàng gần nhất
router.get('/recent-orders', DashboardController.getRecentOrders);

// ================================================================
// REVENUE
// ================================================================

// Doanh thu theo ngày
router.get('/revenue-trend', DashboardController.getRevenueTrend);

// Doanh thu theo phim
router.get('/revenue-by-movie', DashboardController.getRevenueByMovie);

// ================================================================
// MOVIES
// ================================================================

// Vé bán theo phim
router.get('/tickets-by-movie', DashboardController.getTicketsByMovie);

// Top phim doanh thu cao
router.get('/top-movies', DashboardController.getTopMovies);

// ================================================================
// BOOKINGS
// ================================================================

// Danh sách giao dịch
router.get('/transactions', DashboardController.getTransactions);

// Booking theo trạng thái
router.get('/booking-status', DashboardController.getBookingStatus);

// ================================================================
// USERS
// ================================================================

// Tăng trưởng user
router.get('/user-growth', DashboardController.getUserGrowth);

// Phân bố trạng thái user
router.get('/user-status', DashboardController.getUserStatus);

// Top khách hàng chi tiêu
router.get('/top-customers', DashboardController.getTopCustomers);

// ================================================================
// CINEMA / ROOM / SHOWTIME / SEAT
// ================================================================

// Hiệu suất theo rạp
router.get('/cinema-performance', DashboardController.getCinemaPerformance);

// Hiệu suất phòng chiếu
router.get('/room-performance', DashboardController.getRoomPerformance);

// Hiệu suất suất chiếu
router.get('/showtime-performance', DashboardController.getShowtimePerformance);

// Công suất ghế toàn hệ thống
router.get('/seat-performance', DashboardController.getSeatPerformance);

// ================================================================
// PRODUCTS
// ================================================================

// Sản phẩm bán chạy
router.get('/product-performance', DashboardController.getProductPerformance);

// ================================================================
// COUPON
// ================================================================

// Hiệu quả sử dụng coupon
router.get('/coupon-performance', DashboardController.getCouponPerformance);

// ================================================================
// CONTENT
// ================================================================

// Thống kê nội dung website
router.get('/content-stats', DashboardController.getContentStats);

// ================================================================
// OTP / SECURITY
// ================================================================

// Thống kê OTP
router.get('/otp-stats', DashboardController.getOtpStats);

// ================================================================
// REVIEWS
// ================================================================

// Thống kê review phim
router.get('/review-stats', DashboardController.getReviewStats);

module.exports = router;
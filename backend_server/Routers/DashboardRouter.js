const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// ================================================================
// 1. DASHBOARD OVERVIEW
// ================================================================

router.get('/stats', DashboardController.getStats);

router.get('/period-comparison', DashboardController.getPeriodComparison);

// ================================================================
// 2. REVENUE
// ================================================================

router.get('/revenue-trend', DashboardController.getRevenueTrend);

router.get('/revenue-by-movie', DashboardController.getRevenueByMovie);

router.get('/revenue-details', DashboardController.getTransactions);

// ================================================================
// 3. MOVIES
// ================================================================

router.get('/tickets-by-movie', DashboardController.getTicketsByMovie);

router.get('/top-movies', DashboardController.getTopMovies);

// ================================================================
// 4. BOOKINGS / TRANSACTIONS
// ================================================================

router.get('/transactions', DashboardController.getTransactions);

router.get('/booking-status', DashboardController.getBookingStatus);

// ================================================================
// 5. USERS
// ================================================================

router.get('/user-growth', DashboardController.getUserGrowth);

router.get('/user-status', DashboardController.getUserStatus);

router.get('/top-customers', DashboardController.getTopCustomers);

// ================================================================
// 6. CINEMA / ROOM / SHOWTIME / SEAT
// ================================================================

router.get('/cinema-performance', DashboardController.getCinemaPerformance);

router.get('/room-performance', DashboardController.getRoomPerformance);

router.get('/showtime-performance', DashboardController.getShowtimePerformance);

router.get('/seat-performance', DashboardController.getSeatPerformance);

// ================================================================
// 7. PRODUCTS (BẮP NƯỚC)
// ================================================================

router.get('/product-performance', DashboardController.getProductPerformance);

// ================================================================
// 8. COUPON
// ================================================================

router.get('/coupon-performance', DashboardController.getCouponPerformance);

// ================================================================
// 9. CONTENT (NỘI DUNG WEBSITE)
// ================================================================

router.get('/content-stats', DashboardController.getContentStats);

// ================================================================
// 10. OTP / SECURITY
// ================================================================

router.get('/otp-stats', DashboardController.getOtpStats);

// ================================================================
// 11. REVIEWS (ĐÁNH GIÁ PHIM)
// ================================================================

router.get('/review-stats', DashboardController.getReviewStats);

// ================================================================
// 12. REVENUE ANALYSIS (MỚI)
// ================================================================

// Doanh thu theo giờ trong ngày (0-23h)
router.get('/revenue-by-hour', DashboardController.getRevenueByHour);

// Doanh thu theo loại ghế (STANDARD/VIP/DELUXE/RECLINER/COUPLE)
router.get('/revenue-by-seat-type', DashboardController.getRevenueBySeatType);

// Doanh thu theo ngày trong tuần (T2 -> CN)
router.get('/revenue-by-weekday', DashboardController.getRevenueByWeekday);

// Doanh thu theo loại phòng (2D/3D/VIP/IMAX)
router.get('/revenue-by-room-type', DashboardController.getRevenueByRoomType);

// ================================================================
// 13. TOP SHOWTIMES (MỚI)
// ================================================================

// Top suất chiếu có doanh thu cao nhất
router.get('/top-showtimes', DashboardController.getTopShowtimes);

// ================================================================
// 14. BOOKING DETAIL (MỚI)
// ================================================================

// Chi tiết 1 đơn hàng (dùng cho modal drill-down)
router.get('/bookings/:id', DashboardController.getBookingDetail);

module.exports = router;
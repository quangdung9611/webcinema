const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// ================================================================
// 1. DASHBOARD OVERVIEW
// ================================================================

// Tổng quan KPI (có so sánh với kỳ trước)
router.get('/stats', DashboardController.getStats);

// So sánh doanh thu giữa các kỳ (hôm nay, 7 ngày, 30 ngày, 90 ngày, 1 năm)
router.get('/period-comparison', DashboardController.getPeriodComparison);

// ================================================================
// 2. REVENUE
// ================================================================

// Doanh thu theo ngày (line chart)
router.get('/revenue-trend', DashboardController.getRevenueTrend);

// Doanh thu theo phim (pie chart)
router.get('/revenue-by-movie', DashboardController.getRevenueByMovie);

// Chi tiết doanh thu (alias cho transactions)
router.get('/revenue-details', DashboardController.getTransactions);

// ================================================================
// 3. MOVIES
// ================================================================

// Số vé bán theo phim
router.get('/tickets-by-movie', DashboardController.getTicketsByMovie);

// Top phim doanh thu cao
router.get('/top-movies', DashboardController.getTopMovies);

// ================================================================
// 4. BOOKINGS / TRANSACTIONS
// ================================================================

// Danh sách giao dịch (phân trang, tìm kiếm)
router.get('/transactions', DashboardController.getTransactions);

// Thống kê trạng thái booking
router.get('/booking-status', DashboardController.getBookingStatus);

// ================================================================
// 5. USERS
// ================================================================

// Tăng trưởng user theo thời gian
router.get('/user-growth', DashboardController.getUserGrowth);

// Phân bố trạng thái user (active / banned)
router.get('/user-status', DashboardController.getUserStatus);

// Top khách hàng chi tiêu nhiều nhất
router.get('/top-customers', DashboardController.getTopCustomers);

// ================================================================
// 6. CINEMA / ROOM / SHOWTIME / SEAT
// ================================================================

// Hiệu suất theo rạp
router.get('/cinema-performance', DashboardController.getCinemaPerformance);

// Hiệu suất phòng chiếu
router.get('/room-performance', DashboardController.getRoomPerformance);

// Hiệu suất suất chiếu (top suất có lượng vé cao)
router.get('/showtime-performance', DashboardController.getShowtimePerformance);

// Công suất ghế toàn hệ thống
router.get('/seat-performance', DashboardController.getSeatPerformance);

// ================================================================
// 7. PRODUCTS (BẮP NƯỚC)
// ================================================================

// Sản phẩm bán chạy
router.get('/product-performance', DashboardController.getProductPerformance);

// ================================================================
// 8. COUPON
// ================================================================

// Hiệu quả sử dụng coupon
router.get('/coupon-performance', DashboardController.getCouponPerformance);

// ================================================================
// 9. CONTENT (NỘI DUNG WEBSITE)
// ================================================================

// Thống kê tổng quan nội dung (phim, diễn viên, thể loại, rạp, phòng, blog, promotion, banner, tin tức, đánh giá)
router.get('/content-stats', DashboardController.getContentStats);

// ================================================================
// 10. OTP / SECURITY
// ================================================================

// Thống kê hoạt động OTP theo mục đích và trạng thái
router.get('/otp-stats', DashboardController.getOtpStats);

// ================================================================
// 11. REVIEWS (ĐÁNH GIÁ PHIM)
// ================================================================

// Thống kê đánh giá phim (số lượng + điểm trung bình)
router.get('/review-stats', DashboardController.getReviewStats);

module.exports = router;
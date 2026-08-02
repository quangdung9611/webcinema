const express = require('express');

const router = express.Router();

const DashboardController =
    require('../Controllers/DashboardController');


/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
*/

// Tổng quan KPI
router.get(
    '/stats',
    DashboardController.getStats
);


/*
|--------------------------------------------------------------------------
| REVENUE
|--------------------------------------------------------------------------
*/

// Doanh thu theo ngày
router.get(
    '/revenue-trend',
    DashboardController.getRevenueTrend
);

// Doanh thu theo phim
router.get(
    '/revenue-by-movie',
    DashboardController.getRevenueByMovie
);


/*
|--------------------------------------------------------------------------
| MOVIES
|--------------------------------------------------------------------------
*/

// Vé bán theo phim
router.get(
    '/tickets-by-movie',
    DashboardController.getTicketsByMovie
);

// Top phim
router.get(
    '/top-movies',
    DashboardController.getTopMovies
);


/*
|--------------------------------------------------------------------------
| BOOKINGS
|--------------------------------------------------------------------------
*/

// Giao dịch
router.get(
    '/transactions',
    DashboardController.getTransactions
);

// Booking theo trạng thái
router.get(
    '/booking-status',
    DashboardController.getBookingStatus
);


/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

// User tăng trưởng
router.get(
    '/user-growth',
    DashboardController.getUserGrowth
);

// User theo trạng thái
router.get(
    '/user-status',
    DashboardController.getUserStatus
);

// Top khách hàng
router.get(
    '/top-customers',
    DashboardController.getTopCustomers
);


/*
|--------------------------------------------------------------------------
| CINEMA / ROOM / SHOWTIME / SEAT
|--------------------------------------------------------------------------
*/

// Hiệu suất rạp
router.get(
    '/cinema-performance',
    DashboardController.getCinemaPerformance
);

// Hiệu suất phòng
router.get(
    '/room-performance',
    DashboardController.getRoomPerformance
);

// Hiệu suất suất chiếu
router.get(
    '/showtime-performance',
    DashboardController.getShowtimePerformance
);

// Công suất ghế toàn hệ thống
router.get(
    '/seat-performance',
    DashboardController.getSeatPerformance
);


/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
*/

// Sản phẩm bán chạy
router.get(
    '/product-performance',
    DashboardController.getProductPerformance
);


/*
|--------------------------------------------------------------------------
| COUPON
|--------------------------------------------------------------------------
*/

// Hiệu quả coupon
router.get(
    '/coupon-performance',
    DashboardController.getCouponPerformance
);


/*
|--------------------------------------------------------------------------
| CONTENT
|--------------------------------------------------------------------------
*/

// Thống kê nội dung website
router.get(
    '/content-stats',
    DashboardController.getContentStats
);


/*
|--------------------------------------------------------------------------
| OTP / SECURITY
|--------------------------------------------------------------------------
*/

// OTP statistics
router.get(
    '/otp-stats',
    DashboardController.getOtpStats
);


/*
|--------------------------------------------------------------------------
| REVIEWS
|--------------------------------------------------------------------------
*/

// Review / rating
router.get(
    '/review-stats',
    DashboardController.getReviewStats
);


module.exports = router;
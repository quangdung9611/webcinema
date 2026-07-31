const express = require('express');
const router = express.Router();

const DashboardController = require('../Controllers/DashboardController');


// =========================================================
// ADMIN DASHBOARD
// =========================================================

router.get('/me', (req, res) => {
    res.json({
        success: true,
        message: 'Admin lane active'
    });
});


// =========================================================
// STATS
// =========================================================

router.get(
    '/stats',
    DashboardController.getStats
);


// =========================================================
// CHART 1
// Doanh thu theo thời gian
// =========================================================

router.get(
    '/revenue-chart',
    DashboardController.getRevenueChart
);


// =========================================================
// CHART 2
// Doanh thu theo phim
// =========================================================

router.get(
    '/movie-revenue-chart',
    DashboardController.getMovieRevenueChart
);


// =========================================================
// CHART 3
// Số vé bán theo phim
// =========================================================

router.get(
    '/ticket-chart',
    DashboardController.getTicketChart
);


// =========================================================
// CHART 4
// Tăng trưởng người dùng
// =========================================================

router.get(
    '/user-growth-chart',
    DashboardController.getUserGrowthChart
);


// =========================================================
// TOP MOVIES
// =========================================================

router.get(
    '/top-movies',
    DashboardController.getTopMovies
);


module.exports = router;
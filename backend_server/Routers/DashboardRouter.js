const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// 1. Thống kê tổng quan (có period optional)
router.get('/stats', DashboardController.getStats);

// 2. Doanh thu theo ngày (line chart)
router.get('/revenue-trend', DashboardController.getRevenueTrend);

// 3. Doanh thu theo phim (pie chart)
router.get('/revenue-by-movie', DashboardController.getRevenueByMovie);

// 4. Số vé bán theo phim (bar chart)
router.get('/tickets-by-movie', DashboardController.getTicketsByMovie);

// 5. Top phim doanh thu cao (danh sách)
router.get('/top-movies', DashboardController.getTopMovies);

module.exports = router;
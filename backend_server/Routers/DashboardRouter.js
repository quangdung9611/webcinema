const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

/**
 * @route   GET /admin/api/dashboard/stats
 * @desc    Thống kê tổng quan với bộ lọc thời gian
 * @query   period: today, week, month, quarter, year (default: week)
 */
router.get('/stats', DashboardController.getStats);

/**
 * @route   GET /admin/api/dashboard/chart
 * @desc    Lấy dữ liệu biểu đồ theo loại và thời gian
 * @query   type: daily, weekly, monthly (default: daily)
 * @query   period: số ngày, default: 30
 */
router.get('/chart', DashboardController.getChartData);

/**
 * @route   GET /admin/api/dashboard/top-movies
 * @desc    Lấy danh sách phim doanh thu cao nhất
 * @query   limit: số lượng (default: 10)
 */
router.get('/top-movies', DashboardController.getTopMovies);

/**
 * @route   GET /admin/api/dashboard/user-growth
 * @desc    Lấy dữ liệu tăng trưởng người dùng mới
 * @query   days: số ngày (default: 30)
 */
router.get('/user-growth', DashboardController.getUserGrowth);

/**
 * @route   GET /admin/api/dashboard/me
 * @desc    Kiểm tra trạng thái admin (giữ nguyên)
 */
router.get('/me', (req, res) => {
    res.json({ success: true, message: 'Admin lane active' });
});

module.exports = router;
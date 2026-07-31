const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// Giữ nguyên route me
router.get('/me', (req, res) => {
    res.json({ success: true, message: "Admin lane active" });
});

// ✅ Sửa đúng tên method
router.get('/stats', DashboardController.getStats);
router.get('/revenue-chart', DashboardController.getRevenueChartData);
// Thêm route mới nếu cần
router.get('/top-movies', DashboardController.getTopMovies);
router.get('/user-growth', DashboardController.getUserGrowth);

module.exports = router;
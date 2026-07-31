const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

router.get('/me', (req, res) => {
    res.json({ success: true, message: "Admin lane active" });
});

router.get('/stats', DashboardController.getStats);
router.get('/revenue-chart', DashboardController.getRevenueChartData);
router.get('/top-movies', DashboardController.getTopMovies);
router.get('/user-growth', DashboardController.getUserGrowth);

module.exports = router;
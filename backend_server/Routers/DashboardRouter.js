const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController'); // ✅ Đổi tên

/**
 * @route   GET /admin/api/manage/me
 * Lấy thông tin admin để giữ trạng thái đăng nhập
 */
router.get('/me', (req, res) => {
    res.json({ 
        success: true, 
        message: "Admin lane active" 
    });
});

/**
 * @route   GET /admin/api/manage/stats
 */
router.get('/stats', DashboardController.getDashboardStats); // ✅ Đổi

/**
 * @route   GET /admin/api/manage/revenue-chart
 */
router.get('/revenue-chart', DashboardController.getRevenueChartData); // ✅ Đổi

module.exports = router;
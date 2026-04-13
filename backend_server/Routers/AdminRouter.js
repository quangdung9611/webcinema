const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/AdminController');
const AuthMiddleware = require('../Middlewares/AuthMiddleware');

// Route này sẽ nhận admintoken vì nó được gọi từ path có tiền tố /admin
router.use(AuthMiddleware); 

// Lấy thông tin admin để giữ trạng thái đăng nhập (Cái này cực kỳ quan trọng để F5 không mất)
// Frontend sẽ gọi: /admin/api/manage/me
router.get('/me', (req, res) => {
    // req.user đã được AuthMiddleware giải mã từ admintoken
    res.json({ success: true, user: req.user });
});

/**
 * @route   GET /admin/api/manage/stats
 */
router.get('/stats', AdminController.getDashboardStats);

/**
 * @route   GET /admin/api/manage/revenue-chart
 */
router.get('/revenue-chart', AdminController.getRevenueChartData);

module.exports = router;
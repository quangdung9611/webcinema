const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/AdminController');

// MỞ RA: Dùng đúng cái Middleware mình vừa tối ưu
const AuthMiddleware = require('../Middlewares/AuthMiddleware');

/**
 * TẤT CẢ ROUTE Ở ĐÂY ĐỀU PHẢI QUA AUTH
 * Vì router này được mount tại /api/admin/manage trong server.js
 * Nên AuthMiddleware sẽ tự động check 'admintoken' (path: /api)
 */
router.use(AuthMiddleware); 

/**
 * @route   GET /api/admin/manage/stats
 */
router.get('/stats', AdminController.getDashboardStats);

/**
 * @route   GET /api/admin/manage/revenue-chart
 */
router.get('/revenue-chart', AdminController.getRevenueChartData);

// Nếu Dũng đã viết hàm này ở Controller thì mở ra luôn cho xịn
// router.get('/recent-bookings', AdminController.getRecentBookings);

module.exports = router;
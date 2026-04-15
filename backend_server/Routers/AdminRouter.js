const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/AdminController');

// 🔥 BỎ DÒNG NÀY: router.use(AuthMiddleware); 
// Vì ông đã bỏ verify để tránh lỗi "argument handler must be a function"

/**
 * @route   GET /admin/api/manage/me
 * Lấy thông tin admin để giữ trạng thái đăng nhập
 */
router.get('/me', (req, res) => {
    // Vì bỏ Middleware nên không có req.user tự động
    // Dũng nên để logic check user trong Controller hoặc tạm thời trả về thông báo 
    // để Frontend không bị crash khi gọi endpoint này.
    res.json({ 
        success: true, 
        message: "Admin lane active" 
    });
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
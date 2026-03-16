const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/AdminController');

// Middleware xác thực (Dũng nên mở ra khi đã làm xong phần Login/Auth)
// const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/admin/stats
 * @desc    Lấy số liệu thống kê tổng quát (Phim, User, Vé, Doanh thu tổng)
 * @access  Private (Admin Only)
 */
router.get('/stats', AdminController.getDashboardStats);

/**
 * @route   GET /api/admin/revenue-chart
 * @desc    Lấy dữ liệu cho biểu đồ (Bao gồm: Doanh thu theo ngày, Doanh thu phim, và Chi tiết vé)
 * @query   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access  Private (Admin Only)
 */
// Endpoint này giờ đây sẽ trả về cả ticketData (biểu đồ cột chi tiết) mà mình vừa viết ở Controller
router.get('/revenue-chart', AdminController.getRevenueChartData);

/**
 * @route   GET /api/admin/recent-bookings
 * @desc    Lấy danh sách các giao dịch đặt vé gần đây (Dạng danh sách như ACB)
 */
// Nếu Dũng muốn liệt kê danh sách chữ y hệt lịch sử giao dịch ngân hàng, 
// hãy mở hàm này trong Controller nhé.
// router.get('/recent-bookings', AdminController.getRecentBookings);

module.exports = router;
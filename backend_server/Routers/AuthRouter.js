const express = require('express');
const router = express.Router();

// Import Controller
const authController = require('../Controllers/AuthController');

// Import Middleware
const authMiddleware = require('../Middlewares/AuthMiddleware');

// ===========================================================
// 1. CÁC ĐƯỜNG DẪN PUBLIC (Không cần Token)
// ===========================================================

// Đăng ký
router.post('/register', authController.register);

// Đăng nhập 
// Khi gọi /api/admin/auth/login -> isApiAdmin sẽ là true -> ăn path /admin
// Khi gọi /api/auth/login -> isApiAdmin sẽ là false -> ăn path /
router.post('/login', authController.login);

// ===========================================================
// 2. CỔNG THÔNG TIN CÁ NHÂN (Profile)
// ===========================================================

/**
 * Lấy thông tin cá nhân
 */
router.get('/me', authMiddleware, authController.getMe);

// ===========================================================
// 3. ĐĂNG XUẤT (Logout)
// ===========================================================

// Đăng xuất
// Controller mới đã có clearCookie cho cả 2 path nên cực kỳ an toàn
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
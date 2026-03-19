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

// Đăng nhập (Dùng chung cho cả Admin và User)
router.post('/login', authController.login);

// ===========================================================
// 2. CỔNG THÔNG TIN CÁ NHÂN (Profile)
// ===========================================================

/**
 * Lấy thông tin cá nhân
 * Middleware sẽ tự bốc 'admintoken' hoặc 'usertoken' tùy theo 
 * việc bạn gọi qua đầu /admin/api/auth hay /api/auth ở server.js
 */
router.get('/me', authMiddleware, authController.getMe);

// ===========================================================
// 3. ĐĂNG XUẤT (Logout)
// ===========================================================

// Đăng xuất (Controller mới sẽ xóa sạch cả 2 loại token ở path '/')
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
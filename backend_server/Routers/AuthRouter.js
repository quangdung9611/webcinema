const express = require('express');
const router = express.Router();

// Import Controller
const authController = require('../Controllers/AuthController');

// Import Middleware
const authMiddleware = require('../Middlewares/AuthMiddleware');

// ===========================================================
// 1. CÁC ĐƯỜNG DẪN PUBLIC (Không cần Token)
// ===========================================================

// Đăng ký tài khoản (Mặc định là customer)
router.post('/register', authController.register);

// Đăng nhập (Controller đã xử lý cấp thẻ dựa trên role và path)
router.post('/login', authController.login);

// ===========================================================
// 2. NHÓM API DÀNH CHO USER (Path: /api/auth/...)
// ===========================================================

// Lấy thông tin cá nhân của User
// Middleware sẽ tự động bốc 'usertoken' vì path không chứa '/admin'
router.get('/me', authMiddleware, authController.getMe);


// ===========================================================
// 3. NHÓM API DÀNH CHO ADMIN (Path: /api/admin/auth/...)
// ===========================================================

/**
 * LƯU Ý: Để Middleware nhận diện được isAdminPath, 
 * ông nên mount router này vào path có chữ '/admin' trong server.js 
 * Ví dụ: app.use('/api/admin/auth', authRoutes);
 */
router.get('/admin/me', authMiddleware, authController.getMe);


// ===========================================================
// 4. ĐĂNG XUẤT (Logout)
// ===========================================================

// Đăng xuất tổng lực: Xóa sạch cả 2 thẻ ở cả 2 path '/' và '/admin'
// Chúng ta cho phép gọi logout mà không cần middleware quá gắt gao để đảm bảo dọn dẹp được máy khách
router.post('/logout', authController.logout);

module.exports = router;
const express = require('express');
const router = express.Router();

// Import Controller
const authController = require('../Controllers/AuthController');

// Import Middleware (Người gác cổng đa năng mình vừa sửa)
const authMiddleware = require('../Middlewares/AuthMiddleware');

// ===========================================================
// 1. CÁC ĐƯỜNG DẪN PUBLIC (Không cần Token)
// ===========================================================

// Đăng ký (Dùng chung hoặc cho User)
router.post('/register', authController.register);

// Đăng nhập 
// Lưu ý: Cả Admin và User đều dùng chung Route này, 
// nhưng nhờ cổng app.use ở server.js mà nó sẽ tự cấp đúng loại Cookie.
router.post('/login', authController.login);

// ===========================================================
// 2. Cổng thông tin cá nhân (Profile)
// ===========================================================

/**
 * Lấy thông tin cá nhân (Dùng chung cho cả Admin và User)
 * - Nếu gọi qua /api/auth/me -> Middleware bốc usertoken
 * - Nếu gọi qua /admin/api/auth/me -> Middleware bốc admintoken
 */
router.get('/me', authMiddleware, authController.getMe);

// Route dự phòng dành riêng cho Admin nếu Dũng muốn phân biệt rõ
router.get('/admin/me', authMiddleware, authController.getMe);

// ===========================================================
// 3. Đăng xuất (Logout)
// ===========================================================

// Đăng xuất chung
router.post('/logout', authMiddleware, authController.logout);

// Đăng xuất riêng cho Admin (Để đảm bảo xóa đúng Path '/admin')
router.post('/admin/logout', authMiddleware, authController.logout);

module.exports = router;
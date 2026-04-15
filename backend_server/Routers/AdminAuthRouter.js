const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
// 🔥 Sử dụng verifyAdmin để ép buộc chỉ chấp nhận admintoken
const { verifyAdmin } = require('../Middlewares/AuthMiddleware');

// Path gốc: /api/admin/auth

// 1. Login Admin
// Khi login, Backend của ông sẽ dựa vào role để cấp 'admintoken'
router.post('/login', authController.login); 

// 2. Lấy thông tin Admin (Profile)
// Dùng verifyAdmin: Nếu ông cầm usertoken mà mò vào đây, nó sẽ báo 401/403 ngay
router.get('/me', verifyAdmin, authController.getMe); 

// 3. Logout Admin
router.post('/logout', authController.logout);

module.exports = router;
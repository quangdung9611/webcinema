const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
// 🔥 Sử dụng verifyAdmin để ép buộc chỉ chấp nhận admintoken
const { verifyAdmin } = require('../Middlewares/AuthMiddleware');

/**
 * 🚩 ĐƯỜNG DẪN GỐC (Mounted trong server.js): /admin/api/auth
 */

// 1. Login Admin
// Endpoint: POST /admin/api/auth/login
router.post('/login', authController.login); 

// 2. Lấy thông tin Admin (Profile)
// Endpoint: GET /admin/api/auth/me
// Dùng verifyAdmin: Chỉ cho phép admintoken, usertoken sẽ bị đá văng
router.get('/me', verifyAdmin, authController.getMe); 

// 3. Logout Admin
// Endpoint: POST /admin/api/auth/logout
router.post('/logout', authController.logout);

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
// 🔥 Chỉ sử dụng verifyUser để ép buộc chỉ chấp nhận usertoken cho làn đường này
const { verifyUser } = require('../Middlewares/AuthMiddleware');

// Path gốc: /api/auth

// 1. Đăng ký & Đăng nhập (Công khai)
router.post('/register', authController.register);
router.post('/login', authController.login); 

// 2. Lấy thông tin người dùng (Profile trang khách)
// Dùng verifyUser: Nó sẽ chỉ tìm 'usertoken' trong cookie. 
// Nếu một Admin đang lướt trang khách, middleware này vẫn đảm bảo họ được định danh đúng quyền User.
router.get('/me', verifyUser, authController.getMe); 

// 3. Đăng xuất
router.post('/logout', authController.logout);

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
const authMiddleware = require('../Middlewares/AuthMiddleware');

// Path gốc: /api/admin/auth
// Login admin riêng để dễ kiểm soát logic cấp admintoken (Path=/admin)
router.post('/login', authController.login); 
router.get('/me', authMiddleware, authController.getMe); // Middleware sẽ lấy admintoken
router.post('/logout', authController.logout);

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
const authMiddleware = require('../Middlewares/AuthMiddleware');

// Path gốc: /api/auth
router.post('/register', authController.register);
router.post('/login', authController.login); 
router.get('/me', authMiddleware, authController.getMe); // Middleware sẽ lấy usertoken
router.post('/logout', authController.logout);

module.exports = router;
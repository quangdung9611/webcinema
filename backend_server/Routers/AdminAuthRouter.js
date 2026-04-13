const express = require('express');
const router = express.Router();
const authController = require('../Controllers/AuthController');
const authMiddleware = require('../Middlewares/AuthMiddleware');

// Viết đè logic login cho Admin ở đây
router.post('/login', async (req, res, next) => {
    // 1. Thực hiện login như bình thường (tận dụng logic có sẵn)
    // Lưu ý: Đảm bảo authController.login trả về dữ liệu thay vì res.send luôn 
    // Hoặc ông tách logic login ra một hàm riêng.
    
    // Nếu ông muốn đơn giản, hãy sửa lại Controller login để nó hỗ trợ xóa cookie cũ:
    // Tạm thời tui giả định ông gọi thẳng vào logic login của admin:
    
    // TRƯỚC KHI CẤP TOKEN MỚI, XÓA SẠCH TOKEN CŨ CỦA USER
    res.clearCookie('usertoken', {
        path: '/', 
        secure: true,
        sameSite: 'None'
    });

    // Sau đó mới gọi tiếp logic login của Admin
    return authController.login(req, res, next);
});

router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
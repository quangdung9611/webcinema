const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController');

/**
 * ==========================================
 * NHÓM ROUTE DÀNH CHO NGƯỜI DÙNG (CUSTOMER)
 * ==========================================
 */

// 1. Lấy thông tin cá nhân (Profile)
router.get('/profile', userController.getUserProfile);

// 2. Tự cập nhật thông tin cá nhân
router.put('/profile/update', userController.updateUserProfile);

// 3. Lấy lịch sử giao dịch
router.get('/booking-history', userController.getBookingHistory);

// 4. Gửi OTP quên mật khẩu
router.post(
    '/send-reset-otp',
    userController.sendResetOTP
);

// 5. Xác thực OTP
router.post(
    '/verify-reset-otp',
    userController.verifyResetOTP
);

// 6. Đặt lại mật khẩu
router.post(
    '/reset-password',
    userController.resetPassword
);

// 7. Xóa sạch lịch sử và Reset điểm
router.post(
    '/clear-history',
    userController.clearBookingHistory
);

/**
 * ==========================================
 * NHÓM ROUTE QUẢN TRỊ (ADMIN)
 * ==========================================
 */

// 8. Lấy danh sách tất cả user
router.get('/', userController.getAllUsers);

// 9. Thêm mới user trực tiếp từ Admin
router.post('/add', userController.createUser);

// 10. Cập nhật user theo ID
router.put('/update/:user_id', userController.updateUser);

// 11. Xóa user khỏi hệ thống
router.delete('/delete/:user_id', userController.deleteUser);

module.exports = router;
const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController'); 
const verifyToken = require('../Middlewares/AuthMiddleware');

/**
 * ==========================================
 * NHÓM ROUTE DÀNH CHO NGƯỜI DÙNG (CUSTOMER)
 * Yêu cầu verifyToken để lấy user_id từ JWT
 * ==========================================
 */

// 1. Lấy thông tin cá nhân (Profile)
router.get('/profile', verifyToken, userController.getUserProfile);

// 2. Tự cập nhật thông tin cá nhân (Họ tên, SĐT, Địa chỉ, Đổi mật khẩu)
router.put('/profile/update', verifyToken, userController.updateUserProfile);

// 3. Lấy lịch sử giao dịch (MỚI BỔ SUNG)
// Route này sẽ gọi hàm getBookingHistory ông vừa thêm vào Controller
router.get('/booking-history', verifyToken, userController.getBookingHistory);


/**
 * ==========================================
 * NHÓM ROUTE QUẢN TRỊ (ADMIN)
 * Quản lý danh sách người dùng trong hệ thống
 * ==========================================
 */

// 4. Lấy danh sách tất cả user (Hiển thị lên bảng Admin)
router.get('/', userController.getAllUsers);

// 5. Thêm mới user trực tiếp từ Admin
router.post('/add', userController.createUser);

// 6. Cập nhật user theo ID (Admin sửa thông tin hoặc đổi Role user)
// Đặt dưới /profile/update để không bị trùng lặp route
router.put('/update/:user_id', userController.updateUser);

// 7. Xóa user khỏi hệ thống
router.delete('/delete/:user_id', userController.deleteUser);


module.exports = router;
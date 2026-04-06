const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController'); 
const verifyToken = require('../Middlewares/AuthMiddleware');

/**
 * ==========================================
 * NHÓM ROUTE DÀNH CHO NGƯỜI DÙNG (CUSTOMER)
 * ==========================================
 */

// 1. Lấy thông tin cá nhân (Profile)
router.get('/profile', verifyToken, userController.getUserProfile);

// 2. Tự cập nhật thông tin cá nhân
router.put('/profile/update', verifyToken, userController.updateUserProfile);

// 3. Lấy lịch sử giao dịch
router.get('/booking-history', verifyToken, userController.getBookingHistory);

// 8. Xóa sạch lịch sử và Reset điểm (DŨNG MỚI THÊM)
// BẮT BUỘC phải có verifyToken để lấy req.user.user_id trong Controller
router.post('/clear-history', verifyToken, userController.clearBookingHistory);


/**
 * ==========================================
 * NHÓM ROUTE QUẢN TRỊ (ADMIN)
 * (Nên thêm Middleware check Admin ở đây nếu có)
 * ==========================================
 */

// 4. Lấy danh sách tất cả user
router.get('/', verifyToken, userController.getAllUsers);

// 5. Thêm mới user trực tiếp từ Admin
router.post('/add', verifyToken, userController.createUser);

// 6. Cập nhật user theo ID
router.put('/update/:user_id', verifyToken, userController.updateUser);

// 7. Xóa user khỏi hệ thống
router.delete('/delete/:user_id', verifyToken, userController.deleteUser);

module.exports = router;
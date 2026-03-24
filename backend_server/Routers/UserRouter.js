const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController'); 
const verifyToken = require('../Middlewares/AuthMiddleware');

/**
 * ==========================================
 * NHÓM ROUTE ƯU TIÊN (SPECIFIC ROUTES)
 * Đưa những route này lên đầu để tránh bị nhầm với :user_id
 * ==========================================
 */

// 1. Lấy thông tin cá nhân (Profile)
router.get('/profile', verifyToken, userController.getUserProfile);

// 2. Tự cập nhật thông tin cá nhân (ĐƯA LÊN TRÊN ĐẦU)
router.put('/profile/update', verifyToken, userController.updateUserProfile);

// 3. Lấy danh sách tất cả user
router.get('/', userController.getAllUsers);

/**
 * ==========================================
 * NHÓM ROUTE CÓ THAM SỐ (DYNAMIC ROUTES)
 * ==========================================
 */

// 4. Thêm mới user
router.post('/add', userController.createUser);

// 5. Cập nhật user theo ID (Dành cho Admin)
// Lưu ý: Route này phải nằm dưới /profile/update
router.put('/update/:user_id', userController.updateUser);

// 6. Xóa user theo ID
router.delete('/delete/:user_id', userController.deleteUser);

module.exports = router;
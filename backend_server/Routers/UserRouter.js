const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController'); 
// Lưu ý: Kiểm tra đường dẫn ../Controllers/ cho đúng với thư mục của bạn

/**
 * ==========================================
 * ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES)
 * ==========================================
 */

// 1. Lấy danh sách tất cả user (Dùng cho bảng quản lý)
// GET: http://localhost:5000/api/users/
router.get('/', userController.getAllUsers);

// 2. Thêm mới user (Admin tạo tài khoản cho nhân viên/khách hàng)
// POST: http://localhost:5000/api/users/add
router.post('/add', userController.createUser);

// 3. Cập nhật thông tin user theo ID
// PUT: http://localhost:5000/api/users/update/1
router.put('/update/:user_id', userController.updateUser);

// 4. Xóa user theo ID
// DELETE: http://localhost:5000/api/users/delete/1
router.delete('/delete/:user_id', userController.deleteUser);

module.exports = router;
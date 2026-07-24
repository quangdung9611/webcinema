const express = require('express');
const router = express.Router();
const actorController = require('../Controllers/ActorController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    1. NHÓM PUBLIC (Người dùng xem)
   ========================================================== */

// Lấy tất cả diễn viên
router.get('/', actorController.getAllActors);

// Lấy chi tiết diễn viên theo Slug
router.get('/:slug', actorController.getActorBySlug);

/* ==========================================================
    2. NHÓM ADMIN (Quản lý dữ liệu)
   ========================================================== */

// Lấy thông tin diễn viên theo ID để đổ vào Form sửa
router.get('/id/:id', authenticateAdmin, actorController.getActorById);

// Thêm diễn viên mới - field: actor_avatar
router.post('/add', authenticateAdmin, upload.single('actor_avatar'), actorController.addActor);

// Cập nhật diễn viên - field: actor_avatar
router.put('/update/:id', authenticateAdmin, upload.single('actor_avatar'), actorController.updateActor);

// Xóa diễn viên
router.delete('/delete/:id', authenticateAdmin, actorController.deleteActor);

module.exports = router;
const express = require('express');
const router = express.Router();
const actorController = require('../Controllers/ActorController');
const upload = require('../Middlewares/UploadMiddleware');

/* ==========================================================
    1. NHÓM PUBLIC (Người dùng xem)
   ========================================================== */

// Lấy tất cả diễn viên
router.get('/', actorController.getAllActors);

// Lấy chi tiết diễn viên theo Slug (Ví dụ: /api/actors/tom-holland)
router.get('/:slug', actorController.getActorBySlug);


/* ==========================================================
    2. NHÓM ADMIN (Quản lý dữ liệu)
   ========================================================== */

// Lấy thông tin diễn viên theo ID để đổ vào Form sửa
router.get('/id/:id', actorController.getActorById);

// ✅ Thêm diễn viên mới - Đã sửa field name thành actor_avatar
router.post('/add', upload.single('actor_avatar'), actorController.addActor);

// ✅ Cập nhật diễn viên - Đã sửa field name thành actor_avatar
router.put('/update/:id', upload.single('actor_avatar'), actorController.updateActor);

// Xóa diễn viên
router.delete('/delete/:id', actorController.deleteActor);

module.exports = router;
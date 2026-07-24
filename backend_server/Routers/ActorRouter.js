const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES (không cần auth)
========================================================== */

// Lấy danh sách tất cả diễn viên
router.get("/", ActorController.getAllActors);

// Lấy chi tiết diễn viên theo Slug (phải đặt cuối cùng)
router.get("/:slug", ActorController.getActorBySlug);

/* ==========================================================
   ADMIN ROUTES (cần auth) - GIỐNG USER
========================================================== */

// Lấy chi tiết diễn viên theo ID (admin)
router.get("/:id", authenticateAdmin, ActorController.getActorById);

// Thêm diễn viên mới
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.addActor);

// Cập nhật diễn viên
router.put("/:id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);

// Xóa diễn viên
router.delete("/:id", authenticateAdmin, ActorController.deleteActor);

module.exports = router;
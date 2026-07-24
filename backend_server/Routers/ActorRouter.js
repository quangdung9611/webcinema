const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES
========================================================== */

// Lấy tất cả diễn viên
router.get("/", ActorController.getAllActors);

// Lấy chi tiết diễn viên theo Slug (phải đặt sau các route tĩnh)
router.get("/:slug", ActorController.getActorBySlug);

/* ==========================================================
   ADMIN ROUTES
========================================================== */

// Lấy thông tin diễn viên theo ID (để edit)
router.get("/admin/:id", authenticateAdmin, ActorController.getActorById);

// Thêm diễn viên mới - field: actor_avatar
router.post(
  "/admin",
  authenticateAdmin,
  upload.single("actor_avatar"),
  ActorController.addActor
);

// Cập nhật diễn viên - field: actor_avatar
router.put(
  "/admin/:id",
  authenticateAdmin,
  upload.single("actor_avatar"),
  ActorController.updateActor
);

// Xóa diễn viên
router.delete("/admin/:id", authenticateAdmin, ActorController.deleteActor);

module.exports = router;
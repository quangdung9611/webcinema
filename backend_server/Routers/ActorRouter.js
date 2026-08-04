const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================
// Lấy danh sách diễn viên (có pagination/search) cho public
router.get("/", ActorController.getAllActorsPublic);
// Lấy chi tiết diễn viên theo slug (đặt trước ID để không bị trùng)
router.get("/:slug", ActorController.getActorBySlug);

// ==========================================================
// ADMIN ROUTES (cần auth)
// ==========================================================
// Lấy danh sách diễn viên cho admin (có pagination/search)
router.get("/admin", authenticateAdmin, ActorController.getAllActorsAdmin);
// Lấy chi tiết diễn viên theo ID cho admin
router.get("/:actor_id", authenticateAdmin, ActorController.getActorById);
// Thêm diễn viên
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.addActor);
// Cập nhật diễn viên
router.put("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
// Xóa diễn viên
router.delete("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.deleteActor);

module.exports = router;
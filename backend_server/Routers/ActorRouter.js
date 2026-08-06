const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy danh sách actor (không phân trang)
router.get("/", ActorController.getAllActorsAll);

// Lấy chi tiết actor theo slug
router.get("/:slug", ActorController.getActorBySlug);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy actor có phân trang
router.get("/paginated", authenticateAdmin, ActorController.getActorsWithPagination);

// Lấy chi tiết actor theo ID (đặt TRƯỚC /:slug để tránh xung đột)
router.get("/:actor_id", authenticateAdmin, ActorController.getActorById);

// Thêm diễn viên
router.post(
    "/",
    authenticateAdmin,
    upload.single("actor_avatar"),
    ActorController.createActor
);

// Cập nhật diễn viên
router.put(
    "/:actor_id",
    authenticateAdmin,
    upload.single("actor_avatar"),
    ActorController.updateActor
);

// Xóa diễn viên
router.delete(
    "/:actor_id",
    authenticateAdmin,
    ActorController.deleteActor
);

module.exports = router;
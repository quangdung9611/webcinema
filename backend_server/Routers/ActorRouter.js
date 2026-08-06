const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// VALIDATOR CHO actor_id (chỉ nhận số)
// ==========================================================
router.param('actor_id', (req, res, next, value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'ID diễn viên không hợp lệ' });
    }
    next();
});

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================
// Lấy danh sách (không phân trang)
router.get("/", ActorController.getAllActorsAll);

// Lấy chi tiết theo SLUG - dùng route riêng để tránh xung đột
router.get("/detail/:slug", ActorController.getActorBySlug);

// ==========================================================
// ADMIN ROUTES (cần auth)
// ==========================================================
// Lấy danh sách có phân trang
router.get("/paginated", authenticateAdmin, ActorController.getActorsWithPagination);

// Lấy chi tiết theo ID (admin)
router.get("/:actor_id", authenticateAdmin, ActorController.getActorById);

// CRUD
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.createActor);
router.put("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
router.delete("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.deleteActor);

module.exports = router;
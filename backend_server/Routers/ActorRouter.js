const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

router.param('actor_id', (req, res, next, value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'ID diễn viên không hợp lệ' });
    }
    next();
});

// PUBLIC
router.get("/", ActorController.getAllActorsAll);
router.get("/:slug", ActorController.getActorBySlug);

// ADMIN
router.get("/paginated", authenticateAdmin, ActorController.getActorsWithPagination);
router.get("/:actor_id", authenticateAdmin, ActorController.getActorById);
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.createActor);
router.put("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
router.delete("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.deleteActor);

module.exports = router;
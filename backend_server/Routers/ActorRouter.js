const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
router.get("/", ActorController.getAllActorsAll);
router.get("/:slug", ActorController.getActorBySlug); // đặt sau route số

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
router.get("/paginated", authenticateAdmin, ActorController.getActorsWithPagination);
router.get("/:actor_id(\\d+)", authenticateAdmin, ActorController.getActorById);
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.createActor);
router.put("/:actor_id(\\d+)", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
router.delete("/:actor_id(\\d+)", authenticateAdmin, ActorController.deleteActor);

module.exports = router;
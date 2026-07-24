const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC
router.get("/", ActorController.getAllActors);
router.get("/:slug", ActorController.getActorBySlug);

// ADMIN (dùng actor_id)
router.get("/:actor_id", authenticateAdmin, ActorController.getActorById);
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.addActor);
router.put("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
router.delete("/:actor_id", authenticateAdmin, ActorController.deleteActor);

module.exports = router;
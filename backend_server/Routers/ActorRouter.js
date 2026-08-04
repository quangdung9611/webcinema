const express = require("express");
const router = express.Router();

const ActorController = require("../Controllers/ActorController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/", ActorController.getAllActors);
router.get("/:actor_id", ActorController.getActorById); // ✅ bỏ auth, đặt trước /:slug
router.get("/:slug", ActorController.getActorBySlug);

// ADMIN (cần auth)
router.post("/", authenticateAdmin, upload.single("actor_avatar"), ActorController.addActor);
router.put("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.updateActor);
router.delete("/:actor_id", authenticateAdmin, upload.single("actor_avatar"), ActorController.deleteActor);

module.exports = router;
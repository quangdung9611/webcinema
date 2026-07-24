const express = require("express");
const router = express.Router();
const RoomController = require("../Controllers/RoomController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/cinema/:cinema_id", RoomController.getRoomsByCinema);

// ADMIN (cần auth)
router.get("/", authenticateAdmin, RoomController.getAllRooms);
router.get("/:id", authenticateAdmin, RoomController.getRoomById);
router.post("/add", authenticateAdmin, RoomController.createRoom);
router.put("/update/:id", authenticateAdmin, RoomController.updateRoom);
router.delete("/delete/:id", authenticateAdmin, RoomController.deleteRoom);

module.exports = router;
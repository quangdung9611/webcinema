const express = require("express");
const router = express.Router();
const RoomController = require("../Controllers/RoomController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/cinema/:cinema_id", RoomController.getRoomsByCinema);

// ADMIN (cần auth) - RESTful chuẩn
router.get("/", authenticateAdmin, RoomController.getAllRooms);
router.get("/:room_id", authenticateAdmin, RoomController.getRoomById);
router.post("/", authenticateAdmin, RoomController.createRoom);
router.put("/:room_id", authenticateAdmin, RoomController.updateRoom);
router.delete("/:room_id", authenticateAdmin, RoomController.deleteRoom);

module.exports = router;
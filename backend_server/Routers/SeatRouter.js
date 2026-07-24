const express = require("express");
const router = express.Router();
const SeatController = require("../Controllers/SeatController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC
router.get("/showtime/:showtimeId", SeatController.getSeatMapByShowtime);

// ADMIN (đều cần authenticateAdmin)
router.get("/room/:roomId", authenticateAdmin, SeatController.getSeatsByRoom);
router.post("/init", authenticateAdmin, SeatController.initRoomSeats);
router.delete("/room/:roomId", authenticateAdmin, SeatController.deleteSeatsByRoom);
router.put("/toggle-active", authenticateAdmin, SeatController.toggleSeatActive);
router.put("/update-type", authenticateAdmin, SeatController.updateSeatTypeAndPrice);

module.exports = router;
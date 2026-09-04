const express = require("express");
const router = express.Router();
const SeatController = require("../Controllers/SeatController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================
// Lấy sơ đồ ghế theo suất chiếu
router.get("/showtime/:showtimeId", SeatController.getSeatMapByShowtime);

// ==========================================================
// ADMIN ROUTES (cần auth admin)
// ==========================================================
// Lấy danh sách ghế theo phòng
router.get("/room/:roomId", authenticateAdmin, SeatController.getSeatsByRoom);

// Khởi tạo ghế cho phòng
router.post("/init", authenticateAdmin, SeatController.initRoomSeats);

// Xóa sạch ghế trong phòng
router.delete("/room/:roomId", authenticateAdmin, SeatController.deleteSeatsByRoom);

// Bật/tắt bảo trì ghế
router.put("/toggle-active", authenticateAdmin, SeatController.toggleSeatActive);

// Cập nhật loại ghế + giá
router.put("/update-type", authenticateAdmin, SeatController.updateSeatTypeAndPrice);

module.exports = router;
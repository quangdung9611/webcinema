const express = require("express");
const router = express.Router();
const RoomController = require("../Controllers/RoomController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy tất cả phòng (không phân trang)
router.get("/", RoomController.getAllRoomsAll);

// Lấy phòng theo cinema_id
router.get("/cinema/:cinema_id", RoomController.getRoomsByCinema);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy phòng có phân trang
router.get("/paginated", authenticateAdmin, RoomController.getRoomsWithPagination);

// Lấy chi tiết phòng theo ID (đặt TRƯỚC /cinema/:cinema_id để tránh xung đột)
router.get("/:room_id", authenticateAdmin, RoomController.getRoomById);

// Tạo phòng mới (1 phòng)
router.post("/", authenticateAdmin, RoomController.createRoom);

// 🆕 Tạo nhiều phòng hàng loạt
router.post("/bulk", authenticateAdmin, RoomController.createRoomsBulk);

// Cập nhật phòng
router.put("/:room_id", authenticateAdmin, RoomController.updateRoom);

// Xóa phòng
router.delete("/:room_id", authenticateAdmin, RoomController.deleteRoom);

module.exports = router;
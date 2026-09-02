const express = require("express");
const router = express.Router();
const PriceConfigController = require("../Controllers/PriceConfigController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (Không cần đăng nhập)
// ==========================================================

// Lấy tất cả active
router.get("/active", PriceConfigController.getAllActive);

// Lấy theo room_type
router.get("/room-type/:roomType", PriceConfigController.getByRoomType);

// Lấy danh sách room_type
router.get("/room-types", PriceConfigController.getDistinctRoomTypes);

// Lấy danh sách seat_type
router.get("/seat-types", PriceConfigController.getDistinctSeatTypes);

// Lấy giá vé theo room_type + start_time + date + seat_type
router.get("/price", PriceConfigController.getPrice);

// Lấy theo ID
router.get("/:id", PriceConfigController.getById);

// ==========================================================
// ADMIN ROUTES (Yêu cầu đăng nhập admin)
// ==========================================================

// Lấy tất cả (cho admin) - KHÔNG PHÂN TRANG
router.get("/", authenticateAdmin, PriceConfigController.getAll);

// Lấy tất cả có phân trang
router.get("/paginated", authenticateAdmin, PriceConfigController.getAllWithPagination);

// Tạo mới
router.post("/", authenticateAdmin, PriceConfigController.create);

// Cập nhật
router.put("/:id", authenticateAdmin, PriceConfigController.update);

// Cập nhật status
router.patch("/:id/status", authenticateAdmin, PriceConfigController.updateStatus);

// Xóa
router.delete("/:id", authenticateAdmin, PriceConfigController.delete);

// Seed dữ liệu mặc định
router.post("/seed", authenticateAdmin, PriceConfigController.seed);

module.exports = router;
const express = require("express");
const router = express.Router();
const ShowtimeController = require("../Controllers/ShowTimeController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (Không cần đăng nhập)
// ==========================================================

// Lấy danh sách suất chiếu theo movie, cinema, date (dùng cho quick booking)
router.get("/quick-booking", ShowtimeController.getQuickBookingData);
router.get("/filter-booking", ShowtimeController.getShowtimesForBooking);
router.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);
router.get("/filter-legacy", ShowtimeController.filterShowtimes);

// ✅ THÊM ROUTE NÀY – Lấy chi tiết suất chiếu theo ID (public)
router.get("/detail/:showtime_id", ShowtimeController.getShowtimeDetail);

// ==========================================================
// ADMIN ROUTES (Cần quyền admin)
// ==========================================================

router.get("/", authenticateAdmin, ShowtimeController.getAllShowtimes);
router.get("/:showtime_id", authenticateAdmin, ShowtimeController.getShowtimeDetail);
router.post("/", authenticateAdmin, ShowtimeController.createShowtime);
router.put("/:showtime_id", authenticateAdmin, ShowtimeController.updateShowtime);
router.delete("/:showtime_id", authenticateAdmin, ShowtimeController.deleteShowtime);

module.exports = router;
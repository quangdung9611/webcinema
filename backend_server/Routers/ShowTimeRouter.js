const express = require("express");
const router = express.Router();
const ShowtimeController = require("../Controllers/ShowTimeController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    PUBLIC ROUTES (Không cần đăng nhập)
========================================================== */
// Lấy tất cả suất chiếu (không phân trang)
router.get("/", ShowtimeController.getAllShowtimesAll);

// Lấy danh sách suất chiếu theo movie, cinema, date (dùng cho quick booking)
router.get("/quick-booking", ShowtimeController.getQuickBookingData);
router.get("/filter-booking", ShowtimeController.getShowtimesForBooking);
router.get("/filter-legacy", ShowtimeController.filterShowtimes);

// Lấy suất chiếu theo phim
router.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);

// Lấy suất chiếu theo rạp và phòng
router.get("/by-cinema-room", ShowtimeController.getShowtimesByCinemaAndRoom);

// Lấy chi tiết suất chiếu (public)
router.get("/detail/:showtime_id", ShowtimeController.getShowtimeDetail);

/* ==========================================================
    ADMIN ROUTES (Cần quyền admin)
========================================================== */
// Lấy suất chiếu có phân trang
router.get("/paginated", authenticateAdmin, ShowtimeController.getShowtimesWithPagination);

// Lấy chi tiết suất chiếu (admin)
router.get("/:showtime_id", authenticateAdmin, ShowtimeController.getShowtimeDetail);

// Tạo suất chiếu mới
router.post("/", authenticateAdmin, ShowtimeController.createShowtime);

// Cập nhật suất chiếu
router.put("/:showtime_id", authenticateAdmin, ShowtimeController.updateShowtime);

// Xóa suất chiếu
router.delete("/:showtime_id", authenticateAdmin, ShowtimeController.deleteShowtime);

module.exports = router;
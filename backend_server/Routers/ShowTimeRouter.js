const express = require("express");
const router = express.Router();
const ShowtimeController = require("../Controllers/ShowTimeController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    PUBLIC ROUTES
========================================================== */
router.get("/", ShowtimeController.getAllShowtimesAll);
router.get("/quick-booking", ShowtimeController.getQuickBookingData);
router.get("/filter-booking", ShowtimeController.getShowtimesForBooking);
router.get("/filter-legacy", ShowtimeController.filterShowtimes);
router.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);
router.get("/by-cinema-room", ShowtimeController.getShowtimesByCinemaAndRoom);
router.get("/detail/:showtime_id", ShowtimeController.getShowtimeDetail);

// 👇 ĐƯỜNG DẪN MỚI CHO TRANG MOVIE DETAIL
router.get("/movie-detail", ShowtimeController.getShowtimesForMovieDetail);

/* ==========================================================
    ADMIN ROUTES
========================================================== */
router.get("/paginated", authenticateAdmin, ShowtimeController.getShowtimesWithPagination);
router.get("/:showtime_id", authenticateAdmin, ShowtimeController.getShowtimeDetail);
router.post("/", authenticateAdmin, ShowtimeController.createShowtime);
router.put("/:showtime_id", authenticateAdmin, ShowtimeController.updateShowtime);
router.delete("/:showtime_id", authenticateAdmin, ShowtimeController.deleteShowtime);
// Thêm vào nhóm ADMIN ROUTES
router.post("/bulk", authenticateAdmin, ShowtimeController.bulkCreateShowtimes);
module.exports = router;
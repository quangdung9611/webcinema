const express = require("express");
const router = express.Router();
const ShowtimeController = require("../Controllers/ShowTimeController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/quick-booking", ShowtimeController.getQuickBookingData);
router.get("/filter-booking", ShowtimeController.getShowtimesForBooking);
router.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);
router.get("/filter-legacy", ShowtimeController.filterShowtimes);

// ADMIN (cần auth) - RESTful chuẩn
router.get("/", authenticateAdmin, ShowtimeController.getAllShowtimes);
router.get("/:showtime_id", authenticateAdmin, ShowtimeController.getShowtimeDetail);
router.post("/", authenticateAdmin, ShowtimeController.createShowtime);
router.put("/:showtime_id", authenticateAdmin, ShowtimeController.updateShowtime);
router.delete("/:showtime_id", authenticateAdmin, ShowtimeController.deleteShowtime);

module.exports = router;
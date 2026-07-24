const express = require("express");
const router = express.Router();
const ShowtimeController = require("../Controllers/ShowtimeController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/quick-booking", ShowtimeController.getQuickBookingData);
router.get("/filter-booking", ShowtimeController.getShowtimesForBooking);
router.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);
router.get("/filter-legacy", ShowtimeController.filterShowtimes);

// ADMIN (cần auth)
router.get("/", authenticateAdmin, ShowtimeController.getAllShowtimes);
router.get("/detail/:id", authenticateAdmin, ShowtimeController.getShowtimeDetail);
router.post("/add", authenticateAdmin, ShowtimeController.createShowtime);
router.put("/update/:id", authenticateAdmin, ShowtimeController.updateShowtime);
router.delete("/delete/:id", authenticateAdmin, ShowtimeController.deleteShowtime);

module.exports = router;
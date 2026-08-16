const express = require("express");
const router = express.Router();

const ShowtimeController = require("../Controllers/ShowTimeController");

const {
    authenticateAdmin
} = require("../Middlewares/AdminAuthMiddleware");


/* ==========================================================
    PUBLIC ROUTES
========================================================== */

// GET ALL SHOWTIMES - KHÔNG PHÂN TRANG
router.get(
    "/",
    ShowtimeController.getAllShowtimesAll
);


// QUICK BOOKING
router.get(
    "/quick-booking",
    ShowtimeController.getQuickBookingData
);


// BOOKING SHOWTIMES
router.get(
    "/filter-booking",
    ShowtimeController.getShowtimesForBooking
);


// LEGACY FILTER
router.get(
    "/filter-legacy",
    ShowtimeController.filterShowtimes
);


// SHOWTIMES BY MOVIE
router.get(
    "/movie/:movieId",
    ShowtimeController.getShowtimesByMovie
);


// SHOWTIMES BY CINEMA + ROOM
router.get(
    "/by-cinema-room",
    ShowtimeController.getShowtimesByCinemaAndRoom
);


// SHOWTIME DETAIL - PUBLIC
router.get(
    "/detail/:showtime_id",
    ShowtimeController.getShowtimeDetail
);


// MOVIE DETAIL
router.get(
    "/movie-detail",
    ShowtimeController.getShowtimesForMovieDetail
);


/* ==========================================================
    ADMIN ROUTES
========================================================== */

// GET SHOWTIMES - PAGINATION
router.get(
    "/paginated",
    authenticateAdmin,
    ShowtimeController.getShowtimesWithPagination
);


// ==========================================================
// AUTO SHOWTIME SCHEDULER
//
// POST /api/showtimes/scheduler
//
// Controller:
// ShowtimeController.createAutoSchedule
// ==========================================================
router.post(
    "/scheduler",
    authenticateAdmin,
    ShowtimeController.createAutoSchedule
);


// GET SHOWTIME DETAIL - ADMIN
router.get(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.getShowtimeDetail
);


// CREATE SINGLE SHOWTIME
router.post(
    "/",
    authenticateAdmin,
    ShowtimeController.createShowtime
);


// UPDATE SHOWTIME
router.put(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.updateShowtime
);


// DELETE SHOWTIME
router.delete(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.deleteShowtime
);


module.exports = router;
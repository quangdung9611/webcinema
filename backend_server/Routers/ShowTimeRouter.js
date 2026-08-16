const express = require("express");

const router =
    express.Router();

const ShowtimeController =
    require("../Controllers/ShowTimeController");

const {
    authenticateAdmin
} = require("../Middlewares/AdminAuthMiddleware");


/*==========================================================
    PUBLIC ROUTES
==========================================================*/

/*
 * GET ALL
 * Không phân trang
 */
router.get(
    "/",
    ShowtimeController.getAllShowtimesAll
);


/*
 * QUICK BOOKING
 */
router.get(
    "/quick-booking",
    ShowtimeController.getQuickBookingData
);


/*
 * BOOKING
 */
router.get(
    "/filter-booking",
    ShowtimeController.getShowtimesForBooking
);


/*
 * FILTER LEGACY
 */
router.get(
    "/filter-legacy",
    ShowtimeController.filterShowtimes
);


/*
 * MOVIE DETAIL
 */
router.get(
    "/movie-detail",
    ShowtimeController.getShowtimesForMovieDetail
);


/*
 * BY CINEMA + ROOM
 */
router.get(
    "/by-cinema-room",
    ShowtimeController.getShowtimesByCinemaAndRoom
);


/*
 * BY MOVIE
 */
router.get(
    "/movie/:movieId",
    ShowtimeController.getShowtimesByMovie
);


/*
 * PUBLIC DETAIL
 */
router.get(
    "/detail/:showtime_id",
    ShowtimeController.getShowtimeDetail
);


/*==========================================================
    ADMIN ROUTES
==========================================================*/

/*
 * PAGINATION
 *
 * GET /api/showtimes/paginated
 */
router.get(
    "/paginated",
    authenticateAdmin,
    ShowtimeController.getShowtimesWithPagination
);


/*
 * BULK CREATE
 *
 * POST /api/showtimes/bulk
 *
 * PHẢI ĐẶT TRƯỚC /:showtime_id
 */
router.post(
    "/bulk",
    authenticateAdmin,
    ShowtimeController.bulkCreateShowtimes
);


/*
 * CREATE ONE
 *
 * POST /api/showtimes
 */
router.post(
    "/",
    authenticateAdmin,
    ShowtimeController.createShowtime
);


/*
 * GET DETAIL ADMIN
 */
router.get(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.getShowtimeDetail
);


/*
 * UPDATE
 */
router.put(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.updateShowtime
);


/*
 * DELETE
 */
router.delete(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.deleteShowtime
);


module.exports = router;
const express = require("express");

const router =
    express.Router();

const ShowtimeController =
    require("../Controllers/ShowTimeController");

const {
    authenticateAdmin
} = require("../Middlewares/AdminAuthMiddleware");


/*=========================================================
    PUBLIC ROUTES
=========================================================*/

/*
 * GET ALL
 * Không pagination
 *
 * GET /api/showtimes
 */
router.get(
    "/",
    ShowtimeController.getAllShowtimesAll
);


/*
 * QUICK BOOKING
 *
 * GET /api/showtimes/quick-booking
 */
router.get(
    "/quick-booking",
    ShowtimeController.getQuickBookingData
);


/*
 * BOOKING
 *
 * GET /api/showtimes/filter-booking
 */
router.get(
    "/filter-booking",
    ShowtimeController.getShowtimesForBooking
);


/*
 * LEGACY FILTER
 *
 * GET /api/showtimes/filter-legacy
 */
router.get(
    "/filter-legacy",
    ShowtimeController.filterShowtimes
);


/*
 * MOVIE DETAIL
 *
 * GET /api/showtimes/movie-detail
 */
router.get(
    "/movie-detail",
    ShowtimeController.getShowtimesForMovieDetail
);


/*
 * GET BY CINEMA + ROOM
 *
 * GET /api/showtimes/by-cinema-room
 */
router.get(
    "/by-cinema-room",
    ShowtimeController.getShowtimesByCinemaAndRoom
);


/*
 * GET BY MOVIE
 *
 * GET /api/showtimes/movie/:movieId
 */
router.get(
    "/movie/:movieId",
    ShowtimeController.getShowtimesByMovie
);


/*
 * PUBLIC DETAIL
 *
 * GET /api/showtimes/detail/:showtime_id
 */
router.get(
    "/detail/:showtime_id",
    ShowtimeController.getShowtimeDetail
);


/*=========================================================
    ADMIN ROUTES
=========================================================*/

/*
 * ADMIN PAGINATION
 *
 * GET /api/showtimes/paginated
 *
 * ⚠️ Đặt trước /:showtime_id
 */
router.get(
    "/paginated",
    authenticateAdmin,
    ShowtimeController.getShowtimesWithPagination
);


/*
 * ADMIN BULK CREATE
 *
 * POST /api/showtimes/bulk
 *
 * ShowtimePage dùng API này.
 *
 * Chỉ tạo hàng loạt.
 */
router.post(
    "/bulk",
    authenticateAdmin,
    ShowtimeController.createBulkShowtimes
);


/*
 * ADMIN DETAIL
 */
router.get(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.getShowtimeDetail
);


/*
 * ADMIN UPDATE
 *
 * Lưu ý:
 * ShowtimePage mới không dùng form
 * tạo single nữa.
 *
 * Route này vẫn giữ để xử lý
 * chỉnh sửa suất chiếu nếu cần.
 */
router.put(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.updateShowtime
);


/*
 * ADMIN DELETE
 */
router.delete(
    "/:showtime_id",
    authenticateAdmin,
    ShowtimeController.deleteShowtime
);


module.exports = router;
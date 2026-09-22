// Routers/ShowtimeAdminRouter.js

const express = require("express");
const router = express.Router();

const ShowtimeAdminController = require("../Controllers/ShowtimeAdminController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   CHECK BOOKINGS — ĐẾM KHÁCH ĐÃ ĐẶT
   GET /admin/api/showtimes/:id/check-bookings
   ========================================================== */
router.get(
    "/:id/check-bookings",
    authenticateAdmin,
    ShowtimeAdminController.checkBookings
);

/* ==========================================================
   CANCEL SHOWTIME — HỦY SUẤT CHIẾU
   POST /admin/api/showtimes/:id/cancel
   ========================================================== */
router.post(
    "/:id/cancel",
    authenticateAdmin,
    ShowtimeAdminController.cancelShowtime
);

module.exports = router;
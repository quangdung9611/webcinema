// Routers/ShowtimeAdminRouter.js

const express = require("express");
const router = express.Router();

const ShowtimeAdminController = require("../Controllers/ShowtimeAdminController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

router.get(
    "/:id/check-bookings",
    authenticateAdmin,
    ShowtimeAdminController.checkBookings
);

router.post(
    "/:id/cancel",
    authenticateAdmin,
    ShowtimeAdminController.cancelShowtime
);

module.exports = router;
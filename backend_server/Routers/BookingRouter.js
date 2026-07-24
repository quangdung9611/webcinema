const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/BookingController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// Tất cả đều cần admin
router.get("/", authenticateAdmin, bookingController.getAllBookings);
router.get("/detail/:id", authenticateAdmin, bookingController.getBookingDetails);
router.put("/update/:id/status", authenticateAdmin, bookingController.updateBookingStatus);
router.delete("/delete/:id", authenticateAdmin, bookingController.deleteBooking);

module.exports = router;
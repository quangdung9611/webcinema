const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/BookingController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// Tất cả đều cần admin
router.get("/", authenticateAdmin, bookingController.getAllBookings);
router.get("/detail/:booking_id", authenticateAdmin, bookingController.getBookingDetails);
router.put("/update/:booking_id/status", authenticateAdmin, bookingController.updateBookingStatus);
router.delete("/delete/:booking_id", authenticateAdmin, bookingController.deleteBooking);

module.exports = router;
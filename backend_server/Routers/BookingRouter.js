const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/BookingController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    ADMIN ROUTES (Tất cả đều cần admin)
========================================================== */

// Lấy toàn bộ booking (không phân trang)
router.get("/", authenticateAdmin, bookingController.getAllBookingsAll);

// Lấy booking có phân trang
router.get("/paginated", authenticateAdmin, bookingController.getBookingsWithPagination);

// Lấy chi tiết booking
router.get("/detail/:booking_id", authenticateAdmin, bookingController.getBookingDetails);

// Cập nhật trạng thái booking
router.put("/update/:booking_id/status", authenticateAdmin, bookingController.updateBookingStatus);

// Xóa booking
router.delete("/delete/:booking_id", authenticateAdmin, bookingController.deleteBooking);

module.exports = router;
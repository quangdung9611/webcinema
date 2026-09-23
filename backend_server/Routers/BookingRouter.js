const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/BookingController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    ADMIN ROUTES
========================================================== */

// Lấy toàn bộ booking (không phân trang)
router.get("/", authenticateAdmin, bookingController.getAllBookingsAll);

// Lấy booking có phân trang
router.get("/paginated", authenticateAdmin, bookingController.getBookingsWithPagination);

// ✅ ADMIN — Danh sách booking đã đổi suất chiếu
// ⚠️ PHẢI ĐẶT TRƯỚC route /:booking_id/* để tránh conflict
router.get(
    "/rescheduled",
    authenticateAdmin,
    bookingController.getRescheduledBookings
);

// Lấy chi tiết booking
router.get("/detail/:booking_id", authenticateAdmin, bookingController.getBookingDetails);

// Cập nhật trạng thái booking
router.put("/update/:booking_id/status", authenticateAdmin, bookingController.updateBookingStatus);

// Xóa booking
router.delete("/delete/:booking_id", authenticateAdmin, bookingController.deleteBooking);

/* ==========================================================
    ✅ RESCHEDULE ROUTES (USER)
========================================================== */

// Lấy info để hiện form đổi suất
router.get("/:booking_id/reschedule-info", bookingController.getRescheduleInfo);

// Lấy danh sách suất có thể đổi
router.get("/:booking_id/reschedule-options", bookingController.getRescheduleOptions);

// Lấy ghế trống theo hạng ở suất mới
router.get("/showtime/:showtime_id/available-seats", bookingController.getAvailableSeats);

// Thực hiện đổi suất
router.post("/:booking_id/reschedule", bookingController.rescheduleBooking);

module.exports = router;
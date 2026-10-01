const express = require("express");
const router = express.Router();

const bookingController = require("../Controllers/BookingController");

const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

/* ==========================================================
    ADMIN ROUTES
========================================================== */

// Lấy toàn bộ booking (không phân trang)
router.get("/", authenticateAdmin, bookingController.getAllBookingsAll);

// Lấy booking có phân trang
router.get("/paginated", authenticateAdmin, bookingController.getBookingsWithPagination);

// ✅ ADMIN — Danh sách booking đã đổi suất chiếu
router.get(
    "/rescheduled",
    authenticateAdmin,
    bookingController.getRescheduledBookings
);

// Lấy chi tiết booking (ADMIN)
router.get("/detail/:booking_id", authenticateAdmin, bookingController.getBookingDetails);

// Cập nhật trạng thái booking
router.put("/update/:booking_id/status", authenticateAdmin, bookingController.updateBookingStatus);

// Xóa booking
router.delete("/delete/:booking_id", authenticateAdmin, bookingController.deleteBooking);

/* ==========================================================
    ✅ USER ROUTES
========================================================== */

// ✅ Lấy chi tiết booking của chính user
router.get(
    "/my-booking/:booking_id",
    authenticateUser,
    bookingController.getMyBookingDetail
);

// ✅ UPDATE CUSTOMER INFO — BỔ SUNG ROUTE
// User chỉ sửa được của mình, admin sửa được tất cả
router.post(
    "/update-customer",
    authenticateUser,
    bookingController.updateBookingCustomerInfo
);

/* ==========================================================
    ✅ RESCHEDULE ROUTES (USER)
========================================================== */

// ✅ Thêm authenticateUser
router.get(
    "/:booking_id/reschedule-info",
    authenticateUser,
    bookingController.getRescheduleInfo
);

router.get(
    "/:booking_id/reschedule-options",
    authenticateUser,
    bookingController.getRescheduleOptions
);

// Lấy ghế trống — PUBLIC cũng được (chỉ xem, không sửa)
router.get(
    "/showtime/:showtime_id/available-seats",
    bookingController.getAvailableSeats
);

// ✅ Thêm authenticateUser
router.post(
    "/:booking_id/reschedule",
    authenticateUser,
    bookingController.rescheduleBooking
);

module.exports = router;
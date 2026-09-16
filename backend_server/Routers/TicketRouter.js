const express = require("express");
const router = express.Router();
const ticketController = require("../Controllers/TicketController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Lấy mã QR của vé (chứa URL check-in)
router.get("/qr/:ticketCode", ticketController.getTicketQR);

// Xem giá dự kiến cho 1 ghế
router.get("/preview-price", ticketController.previewTicketPrice);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Lấy tất cả vé
router.get("/all", authenticateAdmin, ticketController.getAllTickets);

// Lấy lịch sử soát vé
router.get("/checkin-history", authenticateAdmin, ticketController.getCheckinHistory);

// Lấy vé theo suất chiếu
router.get("/showtime/:showtimeId", authenticateAdmin, ticketController.getTicketsByShowtime);

// Lấy sơ đồ ghế
router.get("/admin-map/:showtimeId", authenticateAdmin, ticketController.getTicketSeatMap);

// Check-in vé
router.post("/check-in", authenticateAdmin, ticketController.checkInTicket);

// Cập nhật lại giá vé theo suất chiếu
router.post("/recalculate/:showtimeId", authenticateAdmin, ticketController.recalculateTicketPrices);

module.exports = router;
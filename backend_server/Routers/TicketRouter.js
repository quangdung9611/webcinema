const express = require("express");
const router = express.Router();
const ticketController = require("../Controllers/TicketController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Lấy mã QR của vé
router.get("/qr/:ticketCode", ticketController.getTicketQR);

// Xem giá dự kiến cho 1 ghế (có thể public hoặc admin)
router.get("/preview-price", ticketController.previewTicketPrice);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Lấy tất cả vé
router.get("/all", authenticateAdmin, ticketController.getAllTickets);

// Lấy vé theo suất chiếu
router.get("/showtime/:showtimeId", authenticateAdmin, ticketController.getTicketsByShowtime);

// Lấy sơ đồ ghế
router.get("/admin-map/:showtimeId", authenticateAdmin, ticketController.getTicketSeatMap);

// Check-in vé
router.post("/check-in", authenticateAdmin, ticketController.checkInTicket);

// 🔥 Cập nhật lại giá vé theo suất chiếu (dùng khi thay đổi price_config)
router.post("/recalculate/:showtimeId", authenticateAdmin, ticketController.recalculateTicketPrices);

module.exports = router;
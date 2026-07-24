const express = require("express");
const router = express.Router();
const ticketController = require("../Controllers/TicketController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================
// 1. DÀNH CHO ADMIN (QUẢN TRỊ & SOÁT VÉ)
// ==========================================

router.get("/all", authenticateAdmin, ticketController.getAllTickets);
router.get("/showtime/:showtimeId", authenticateAdmin, ticketController.getTicketsByShowtime);
router.get("/admin-map/:showtimeId", authenticateAdmin, ticketController.getTicketSeatMap);
router.post("/check-in", authenticateAdmin, ticketController.checkInTicket);

// ==========================================
// 2. DÀNH CHO KHÁCH HÀNG & HIỂN THỊ (PUBLIC)
// ==========================================

// Có thể thêm authenticateUser nếu muốn bảo vệ
router.get("/qr/:ticketCode", ticketController.getTicketQR);

module.exports = router;
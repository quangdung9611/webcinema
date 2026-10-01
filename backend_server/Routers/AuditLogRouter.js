// Routers/AuditLogRouter.js
const express = require("express");
const router = express.Router();

const AuditLogController = require("../Controllers/AuditLogController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   TẤT CẢ ROUTE ĐỀU CẦN ADMIN
========================================================== */

// Lấy log (filter + phân trang)
router.get("/", authenticateAdmin, AuditLogController.getLogs);

// Thống kê
router.get("/stats", authenticateAdmin, AuditLogController.getStats);

// Chi tiết
router.get("/:audit_id", authenticateAdmin, AuditLogController.getLogById);

// Cleanup
router.delete("/cleanup/old", authenticateAdmin, AuditLogController.cleanupOld);

module.exports = router;
const express = require("express");
const router = express.Router();

const PaymentController = require("../Controllers/PaymentController");

// ✅ Import middleware auth — đã verify tên đúng
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ==========================================================
// 1. TẠO ĐƠN HÀNG TẠM (Redis)
// ✅ BẮT BUỘC ĐĂNG NHẬP — FIX LỖ HỔNG
// ==========================================================
router.post(
    "/process",
    authenticateUser,
    PaymentController.processOrder
);

// ==========================================================
// 2. LẤY THÔNG TIN ĐƠN HÀNG TẠM
// ✅ BẮT BUỘC ĐĂNG NHẬP — FIX LỖ HỔNG
// ==========================================================
router.get(
    "/temp/:tempBookingId",
    authenticateUser,
    PaymentController.getTempData
);

module.exports = router;
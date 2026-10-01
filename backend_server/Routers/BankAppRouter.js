const express = require("express");
const router = express.Router();

const bankAppController = require("../Controllers/BankAppController");

// ✅ Import middleware auth
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ==========================================================
// ✅ TẤT CẢ ROUTES ĐỀU CẦN ĐĂNG NHẬP
// ==========================================================

router.post(
    "/send-otp",
    authenticateUser,
    bankAppController.sendOTP
);

router.post(
    "/verify-otp",
    authenticateUser,
    bankAppController.verifyOTP
);

router.post(
    "/cancel-timeout",
    authenticateUser,
    bankAppController.cancelBookingTimeout
);

router.get(
    "/check-ttl/:tempBookingId",
    authenticateUser,
    bankAppController.checkTTL
);

router.post(
    "/resend-otp",
    authenticateUser,
    bankAppController.resendOtpPayment
);

module.exports = router;
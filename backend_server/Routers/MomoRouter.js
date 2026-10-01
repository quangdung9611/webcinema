const express = require("express");
const router = express.Router();

const MomoController = require("../Controllers/MomoController");

// ✅ Import middleware auth
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ==========================================================
// USER ROUTES — CẦN ĐĂNG NHẬP
// ==========================================================

router.post(
    "/process",
    authenticateUser,
    MomoController.processOrder
);

router.post(
    "/send-otp",
    authenticateUser,
    MomoController.sendOTP
);

router.post(
    "/verify-otp",
    authenticateUser,
    MomoController.verifyOTP
);

router.post(
    "/resend-otp",
    authenticateUser,
    MomoController.resendOtp
);

router.get(
    "/check-ttl/:tempBookingId",
    authenticateUser,
    MomoController.checkTTL
);

router.post(
    "/cancel",
    authenticateUser,
    MomoController.cancelBooking
);

// ==========================================================
// ✅ CALLBACK — KHÔNG CẦN AUTH (Momo server gọi)
// Verify signature trong service
// ==========================================================
router.post(
    "/callback",
    MomoController.callback
);

module.exports = router;
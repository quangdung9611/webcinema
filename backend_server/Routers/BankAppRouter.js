const express = require('express');
const router = express.Router();

const bankAppController =
    require('../Controllers/BankAppController');

router.post(
    '/send-otp',
    bankAppController.sendOTP
);

router.post(
    '/verify-otp',
    bankAppController.verifyOTP
);

router.post(
    '/cancel-timeout',
    bankAppController.cancelBookingTimeout
);

// ============================================================
// 🆕 CHECK TTL - GIỐNG AUTH (/check-otp-ttl)
// ============================================================
router.get(
    '/check-ttl/:tempBookingId',
    bankAppController.checkTTL
);

// ============================================================
// 🆕 RESEND OTP PAYMENT - GIỐNG AUTH (/resend-otp)
// ============================================================
router.post(
    '/resend-otp',
    bankAppController.resendOtpPayment
);

module.exports = router;
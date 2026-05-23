const express = require('express');

const router = express.Router();

// =========================================================
// CONTROLLER
// =========================================================

const ForgotPasswordController =
    require('../Controllers/ForgotPasswordController');

// =========================================================
// SEND OTP (FORGOT PASSWORD)
// =========================================================

router.post(
    '/send-otp',
    ForgotPasswordController.forgotPassword
);

// =========================================================
// VERIFY OTP
// =========================================================

router.post(
    '/verify-otp',
    ForgotPasswordController.verifyOtp
);

// =========================================================
// RESET PASSWORD
// =========================================================

router.post(
    '/reset-password',
    ForgotPasswordController.resetPassword
);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
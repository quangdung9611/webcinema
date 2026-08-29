// routes/auth.js
const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ============================================================
// PUBLIC ROUTES
// ============================================================

// 🆕 ROUTES CHO QUÊN PIN
router.post("/forgot-pin", AuthController.forgotPin);
router.post("/verify-otp-and-change-pin", AuthController.verifyOtpAndChangePin);

// 🆕 ROUTES CHO ĐỒNG BỘ TTL
// router.get("/check-otp-ttl", AuthController.checkOtpTTL);
router.post("/resend-otp", AuthController.resendOtp);

// AUTH ROUTES
router.post("/register-step1", AuthController.registerStep1);
router.post("/complete-registration", AuthController.completeRegistration);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);

// PASSWORD RESET
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/submit-new-password", AuthController.submitNewPassword);
router.post("/verify-otp-and-reset", AuthController.verifyOtpAndReset);
router.post("/verify-reset-otp", AuthController.verifyResetOTP);
router.post("/reset-password", AuthController.resetPassword);

// EMAIL VERIFICATION
router.post("/send-verification", AuthController.sendVerificationEmail);
router.get("/verify-email", AuthController.verifyEmail);

// CHECK LOCK STATUS
router.get("/check-lock", AuthController.checkLockStatus);

// ============================================================
// PRIVATE ROUTES
// ============================================================

router.get("/me", authenticateUser, AuthController.getMe);
router.patch("/change-password", authenticateUser, AuthController.changePassword);
router.post("/logout", authenticateUser, AuthController.logout);
router.post("/logout-all", authenticateUser, AuthController.logoutAllDevices);
router.post("/resend-verification", authenticateUser, AuthController.resendVerification);

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

router.get("/devices", authenticateUser, AuthController.getDevices);
router.delete("/devices/:deviceId", authenticateUser, AuthController.revokeDevice);

module.exports = router;
const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ============================================================
// PUBLIC ROUTES (Không cần xác thực)
// ============================================================

router.post("/register-step1", AuthController.registerStep1);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/submit-new-password", AuthController.submitNewPassword);
router.post("/verify-otp-and-reset", AuthController.verifyOtpAndReset);
router.post("/verify-reset-otp", AuthController.verifyResetOTP);
router.post("/reset-password", AuthController.resetPassword);
router.post("/send-verification", AuthController.sendVerificationEmail);
router.get("/verify-email", AuthController.verifyEmail);
router.get("/check-lock", AuthController.checkLockStatus);

// ============================================================
// PRIVATE ROUTES (Cần xác thực)
// ============================================================

router.get("/me", authenticateUser, AuthController.getMe);
router.patch("/change-password", authenticateUser, AuthController.changePassword);
router.post("/logout", authenticateUser, AuthController.logout);
router.post("/logout-all", authenticateUser, AuthController.logoutAllDevices);

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

router.get("/devices", authenticateUser, AuthController.getDevices);
router.delete("/devices/:deviceId", authenticateUser, AuthController.revokeDevice);

module.exports = router;
// Routers/UserAuthRouter.js
const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ============================================================
// PUBLIC ROUTES — KHÔNG CẦN AUTH
// ============================================================

// 🆕 ROUTES CHO QUÊN PIN
router.post("/forgot-pin", AuthController.forgotPin);
router.post("/verify-otp-and-change-pin", AuthController.verifyOtpAndChangePin);

// 🆕 ROUTES CHO ĐỒNG BỘ TTL
router.get("/check-otp-ttl", AuthController.checkOtpTTL);
router.post("/resend-otp", AuthController.resendOtp);

// 🆕 ROUTE VÔ HIỆU HÓA OTP (KHI NGƯỜI DÙNG RỜI TRANG)
router.post("/invalidate-otp", AuthController.invalidateOtp);

// AUTH ROUTES
router.post("/register-step1", AuthController.registerStep1);
router.post("/complete-registration", AuthController.completeRegistration);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);

// ============================================================
// 🆕 GOOGLE LOGIN — PUBLIC
// ============================================================
// Body: { credential }
// → Verify Google token → Tạo/login user → Trả JWT
router.post("/google", AuthController.googleLogin);

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
// ✅ LOGOUT — KHÔNG CẦN AUTH
// ============================================================
// Lý do:
//   - Logout là idempotent — luôn clear cookie dù token valid/revoked/expired
//   - Nếu có authenticateUser → token revoked → 401 → frontend KHÔNG clear được cookie
//   - Frontend gọi logout khi session expired → cần route này hoạt động 100%
// ============================================================
router.post("/logout", AuthController.logout);

// ============================================================
// PRIVATE ROUTES — CẦN AUTH
// ============================================================

router.get("/me", authenticateUser, AuthController.getMe);
router.patch("/change-password", authenticateUser, AuthController.changePassword);
router.post("/logout-all", authenticateUser, AuthController.logoutAllDevices);
router.post("/resend-verification", authenticateUser, AuthController.resendVerification);

// ============================================================
// 🆕 GOOGLE LOGIN — CẦN AUTH (SAU KHI LOGIN GOOGLE)
// ============================================================
// Body: { phone }
// → Cập nhật SĐT sau khi Google login lần đầu
router.post("/update-phone", authenticateUser, AuthController.updatePhone);

// Body: { newPassword }
// → Tạo password cho user Google (để login email/password)
router.post("/set-password", authenticateUser, AuthController.setPassword);

// ============================================================
// DEVICE MANAGEMENT — CẦN AUTH
// ============================================================

router.get("/devices", authenticateUser, AuthController.getDevices);
router.delete("/devices/:deviceId", authenticateUser, AuthController.revokeDevice);

module.exports = router;
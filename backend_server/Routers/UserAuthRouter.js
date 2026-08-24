const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

// ============================================================
// PUBLIC ROUTES (Không cần xác thực)
// ============================================================

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-otp", AuthController.verifyResetOTP);
router.post("/reset-password", AuthController.resetPassword);
router.post("/send-verification", AuthController.sendVerificationEmail);
router.get("/verify-email", AuthController.verifyEmail);

// ============================================================
// 🟢 THÊM MỚI: CHECK SESSION NHANH (PUBLIC - KHÔNG CẦN AUTH)
// ============================================================

/**
 * Kiểm tra session nhanh
 * GET /api/auth/check-session
 * 
 * Response thành công:
 * {
 *   success: true,
 *   valid: true,
 *   user_id: 123,
 *   role: "customer",
 *   email_verified: 1,
 *   timestamp: "2026-08-24T10:00:00.000Z"
 * }
 * 
 * Response thất bại:
 * {
 *   success: false,
 *   valid: false,
 *   code: "TOKEN_EXPIRED",
 *   message: "Phiên đăng nhập đã hết hạn"
 * }
 */
router.get("/check-session", AuthController.checkSession);

// ============================================================
// PRIVATE ROUTES (Cần xác thực)
// ============================================================

router.get("/me", authenticateUser, AuthController.getMe);
router.patch("/change-password", authenticateUser, AuthController.changePassword);
router.post("/logout", authenticateUser, AuthController.logout);
router.post("/logout-all", authenticateUser, AuthController.logoutAllDevices);

// ============================================================
// 🟢 QUẢN LÝ THIẾT BỊ (DEVICE MANAGEMENT)
// ============================================================

/**
 * Lấy danh sách thiết bị đang đăng nhập
 * GET /api/auth/devices
 * 
 * Response:
 * {
 *   success: true,
 *   devices: [
 *     {
 *       device_id: 1,
 *       device_name: "Windows Chrome",
 *       ip_address: "192.168.1.1",
 *       last_used_at: "2026-08-21T10:00:00.000Z",
 *       created_at: "2026-08-21T09:00:00.000Z",
 *       expires_at: "2026-08-28T09:00:00.000Z"
 *     }
 *   ]
 * }
 */
router.get("/devices", authenticateUser, AuthController.getDevices);

/**
 * Đăng xuất 1 thiết bị cụ thể (khóa thiết bị từ xa)
 * DELETE /api/auth/devices/:deviceId
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Đã đăng xuất thiết bị thành công"
 * }
 */
router.delete("/devices/:deviceId", authenticateUser, AuthController.revokeDevice);

module.exports = router;
/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const AuthController = require("../Controllers/AuthController");
const AuthMiddleware = require("../Middlewares/UserAuthMiddleware");

/*=========================================================
    PUBLIC ROUTES
=========================================================*/

/**
 * Đăng ký
 * POST /api/auth/register
 */
router.post("/register", AuthController.register);

/**
 * Đăng nhập
 * POST /api/auth/login
 */
router.post("/login", AuthController.login);

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
router.post("/refresh", AuthController.refreshToken);

/**
 * Quên mật khẩu - Gửi OTP
 * POST /api/auth/forgot-password
 */
router.post("/forgot-password", AuthController.forgotPassword);

/**
 * Xác thực OTP quên mật khẩu
 * POST /api/auth/verify-reset-otp
 */
router.post("/verify-reset-otp", AuthController.verifyResetOTP);

/**
 * Đặt lại mật khẩu
 * POST /api/auth/reset-password
 */
router.post("/reset-password", AuthController.resetPassword);

/**
 * Gửi email xác thực
 * POST /api/auth/send-verification
 */
router.post("/send-verification", AuthController.sendVerificationEmail);

/**
 * Xác thực email
 * GET /api/auth/verify-email?token=xxx
 */
router.get("/verify-email", AuthController.verifyEmail);

/*=========================================================
    PRIVATE ROUTES (Cần xác thực)
=========================================================*/

/**
 * Thông tin tài khoản hiện tại
 * GET /api/auth/me
 */
router.get("/me", AuthMiddleware.authenticate, AuthController.getMe);

/**
 * Đổi mật khẩu
 * PATCH /api/auth/change-password
 */
router.patch("/change-password", AuthMiddleware.authenticate, AuthController.changePassword);

/**
 * Đăng xuất
 * POST /api/auth/logout
 */
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

/**
 * Đăng xuất tất cả thiết bị
 * POST /api/auth/logout-all
 */
router.post("/logout-all", AuthMiddleware.authenticate, AuthController.logoutAllDevices);

/*=========================================================
    🟢 THÊM MỚI: QUẢN LÝ THIẾT BỊ (DEVICE MANAGEMENT)
=========================================================*/

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
 *       expires_at: "2026-08-28T09:00:00.000Z",
 *       is_current: true
 *     }
 *   ]
 * }
 */
router.get("/devices", AuthMiddleware.authenticate, AuthController.getDevices);

/**
 * Đăng xuất 1 thiết bị cụ thể (khóa thiết bị từ xa)
 * DELETE /api/auth/devices/:deviceId
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Đã đăng xuất thiết bị thành công",
 *   device: {
 *     device_name: "Windows Chrome",
 *     ip_address: "192.168.1.1"
 *   }
 * }
 */
router.delete("/devices/:deviceId", AuthMiddleware.authenticate, AuthController.revokeDevice);

/*=========================================================
    EXPORT
=========================================================*/

module.exports = router;
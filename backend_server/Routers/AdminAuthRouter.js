// Routers/AdminAuthRouter.js
const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ============================================================
// PUBLIC ROUTES — KHÔNG CẦN AUTH
// ============================================================

/**
 * Đăng nhập Admin
 */
router.post("/login", AuthController.adminLogin);

/**
 * Refresh Token
 */
router.post("/refresh", AuthController.refreshToken);

// ============================================================
// 🆕 ADMIN FORGOT PASSWORD ROUTES — PUBLIC
// ============================================================
// ✅ Check role = 'admin' trong service
// → Customer nhập email vào đây → "Email chưa đăng ký"
// ============================================================

/**
 * Quên mật khẩu Admin — Gửi OTP về email
 * POST /admin/api/auth/forgot-password
 * Body: { email }
 */
router.post("/forgot-password", AuthController.adminForgotPassword);

/**
 * Xác thực OTP và đổi mật khẩu mới (Admin)
 * POST /admin/api/auth/verify-otp-and-reset
 * Body: { email, otp, newPassword }
 * - newPassword = '' → chỉ verify OTP
 * - newPassword có giá trị → verify + reset password
 */
router.post("/verify-otp-and-reset", AuthController.adminVerifyOtpAndReset);

/**
 * Gửi lại OTP (Admin)
 * POST /admin/api/auth/resend-otp
 * Body: { email, purpose }
 */
router.post("/resend-otp", AuthController.adminResendOtp);

/**
 * Kiểm tra TTL của OTP (Admin)
 * GET /admin/api/auth/check-otp-ttl?email=...&purpose=...
 */
router.get("/check-otp-ttl", AuthController.adminCheckOtpTTL);

/**
 * ✅ MỚI: Vô hiệu hóa OTP khi admin rời trang
 * POST /admin/api/auth/invalidate-otp
 * Body: { email, purpose }
 * → Dùng chung AuthController.invalidateOtp với user
 * → Không cần check role (chỉ xóa OTP khỏi cache)
 */
router.post("/invalidate-otp", AuthController.invalidateOtp);

// ============================================================
// ✅ LOGOUT — KHÔNG CẦN AUTH
// ============================================================
// Lý do:
//   - Logout là idempotent — luôn clear cookie dù token valid/revoked/expired
//   - Nếu có authenticateAdmin → token revoked → 401 → frontend KHÔNG clear được cookie
//   - Frontend gọi logout khi session expired → cần route này hoạt động 100%
// ============================================================
router.post("/logout", AuthController.logout);

// ============================================================
// PRIVATE ROUTES — CẦN AUTH
// ============================================================

/**
 * Thông tin Admin
 */
router.get("/me", authenticateAdmin, AuthController.getMe);

/**
 * Đổi mật khẩu
 */
router.patch("/change-password", authenticateAdmin, AuthController.changePassword);

/**
 * Đăng xuất tất cả thiết bị
 */
router.post("/logout-all", authenticateAdmin, AuthController.logoutAllDevices);

// ============================================================
// 🟢 QUẢN LÝ THIẾT BỊ CHO ADMIN — CẦN AUTH
// ============================================================

/**
 * Lấy danh sách thiết bị đang đăng nhập của admin
 * GET /admin/api/auth/devices
 */
router.get("/devices", authenticateAdmin, AuthController.getDevices);

/**
 * Đăng xuất 1 thiết bị admin cụ thể (khóa thiết bị từ xa)
 * DELETE /admin/api/auth/devices/:deviceId
 */
router.delete("/devices/:deviceId", authenticateAdmin, AuthController.revokeDevice);

module.exports = router;
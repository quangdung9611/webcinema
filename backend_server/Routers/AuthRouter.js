/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const AuthController = require("../Controllers/AuthController");
const AuthMiddleware = require("../Middleware/AuthMiddleware");

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
    EXPORT
=========================================================*/

module.exports = router;
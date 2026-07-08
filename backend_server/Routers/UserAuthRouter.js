/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const AuthController = require("../Controllers/AuthController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
// ✅ Đúng: authenticateUser = function

/*=========================================================
    PUBLIC ROUTES
=========================================================*/

/**
 * Đăng ký
 */
router.post("/register", AuthController.register);

/**
 * Đăng nhập
 */
router.post("/login", AuthController.login);

/**
 * Refresh Token
 */
router.post("/refresh", AuthController.refreshToken);

/**
 * Quên mật khẩu
 */
router.post("/forgot-password", AuthController.forgotPassword);

/**
 * Verify OTP
 */
router.post("/verify-reset-otp", AuthController.verifyResetOTP);

/**
 * Reset Password
 */
router.post("/reset-password", AuthController.resetPassword);

/**
 * Gửi email xác thực
 */
router.post("/send-verification", AuthController.sendVerificationEmail);

/**
 * Verify Email
 */
router.get("/verify-email", AuthController.verifyEmail);

/*=========================================================
    PRIVATE ROUTES
=========================================================*/

/**
 * Thông tin User
 */
router.get(
    "/me",
    authenticateUser,
    AuthController.getMe
);

/**
 * Đổi mật khẩu
 */
router.patch(
    "/change-password",
    authenticateUser,
    AuthController.changePassword
);

/**
 * Đăng xuất
 */
router.post(
    "/logout",
    authenticateUser,
    AuthController.logout
);

/**
 * Đăng xuất tất cả thiết bị
 */
router.post(
    "/logout-all",
    authenticateUser,
    AuthController.logoutAllDevices
);

/*=========================================================
    EXPORT
=========================================================*/

module.exports = router;
/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const AuthController = require("../Controllers/AuthController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/*=========================================================
    PUBLIC ROUTES
=========================================================*/

/**
 * Đăng nhập Admin
 */
router.post("/login", AuthController.login);

/**
 * Refresh Token
 */
router.post("/refresh", AuthController.refreshToken);

/*=========================================================
    PRIVATE ROUTES
=========================================================*/

/**
 * Thông tin Admin
 */
router.get(
    "/me",
    authenticateAdmin,
    AuthController.getMe
);

/**
 * Đổi mật khẩu
 */
router.patch(
    "/change-password",
    authenticateAdmin,
    AuthController.changePassword
);

/**
 * Đăng xuất
 */
router.post(
    "/logout",
    authenticateAdmin,
    AuthController.logout
);

/**
 * Đăng xuất tất cả thiết bị
 */
router.post(
    "/logout-all",
    authenticateAdmin,
    AuthController.logoutAllDevices
);

/*=========================================================
    EXPORT
=========================================================*/

module.exports = router;
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
router.post("/login", AuthController.adminLogin);

/**
 * Refresh Token
 */
router.post("/refresh", AuthController.refreshToken);

/**
 * ✅ LOGOUT — BỎ MIDDLEWARE
 * Vì:
 * - Nếu token valid → logout OK
 * - Nếu token invalid/revoked → vẫn clear cookie + return 200
 * - Tránh user bị kẹt ở modal "Session expired"
 */
router.post("/logout", AuthController.logout);

/*=========================================================
    PRIVATE ROUTES
=========================================================*/

/**
 * Thông tin Admin
 */
router.get("/me", authenticateAdmin, AuthController.getMe);

/**
 * Đổi mật khẩu
 */
router.patch("/change-password", authenticateAdmin, AuthController.changePassword);

/**
 * Đăng xuất tất cả thiết bị (vẫn cần middleware vì cần userId)
 */
router.post("/logout-all", authenticateAdmin, AuthController.logoutAllDevices);

/*=========================================================
    🟢 QUẢN LÝ THIẾT BỊ CHO ADMIN
=========================================================*/

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
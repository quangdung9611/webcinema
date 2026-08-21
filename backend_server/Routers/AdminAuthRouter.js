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
 * Đăng xuất
 */
router.post("/logout", authenticateAdmin, AuthController.logout);

/**
 * Đăng xuất tất cả thiết bị
 */
router.post("/logout-all", authenticateAdmin, AuthController.logoutAllDevices);

/*=========================================================
    🟢 THÊM MỚI: QUẢN LÝ THIẾT BỊ CHO ADMIN
=========================================================*/

/**
 * Lấy danh sách thiết bị đang đăng nhập của admin
 * GET /admin/api/auth/devices
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
router.get("/devices", authenticateAdmin, AuthController.getDevices);

/**
 * Đăng xuất 1 thiết bị admin cụ thể (khóa thiết bị từ xa)
 * DELETE /admin/api/auth/devices/:deviceId
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Đã đăng xuất thiết bị thành công"
 * }
 */
router.delete("/devices/:deviceId", authenticateAdmin, AuthController.revokeDevice);

module.exports = router;
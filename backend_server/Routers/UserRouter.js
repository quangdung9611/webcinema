/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const AuthMiddleware = require("../Middlewares/UserAuthMiddleware");

/*=========================================================
    USER ROUTES (Cần xác thực)
=========================================================*/

/**
 * Lấy thông tin cá nhân
 * GET /api/users/profile
 */
router.get(
    "/profile",
    AuthMiddleware.authenticate,
    UserController.getUserProfile
);

/**
 * Cập nhật thông tin cá nhân
 * PUT /api/users/profile/update
 */
router.put(
    "/profile/update",
    AuthMiddleware.authenticate,
    UserController.updateUserProfile
);

/**
 * Lấy lịch sử đặt vé
 * GET /api/users/booking-history
 */
router.get(
    "/booking-history",
    AuthMiddleware.authenticate,
    UserController.getMyBookings
);

/**
 * Xóa lịch sử đặt vé
 * DELETE /api/users/clear-history
 */
router.delete(
    "/clear-history",
    AuthMiddleware.authenticate,
    UserController.clearBookingHistory
);

/**
 * Reset điểm của user
 * POST /api/users/reset-points
 */
router.post(
    "/reset-points",
    AuthMiddleware.authenticate,
    UserController.resetMyPoints
);

/*=========================================================
    ADMIN ROUTES (Cần xác thực + quyền admin)
=========================================================*/

/**
 * Lấy danh sách tất cả user
 * GET /api/users
 */
router.get(
    "/",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.getAllUsers
);

/**
 * Lấy chi tiết user theo ID
 * GET /api/users/:user_id
 */
router.get(
    "/:user_id",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.getUserById
);

/**
 * Tạo user mới (Admin)
 * POST /api/users
 */
router.post(
    "/",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.createUser
);

/**
 * Cập nhật user theo ID
 * PUT /api/users/:user_id
 */
router.put(
    "/:user_id",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.updateUser
);

/**
 * Cập nhật trạng thái user (active/banned)
 * PATCH /api/users/:user_id/status
 */
router.patch(
    "/:user_id/status",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.updateUserStatus
);

/**
 * Cập nhật role user (admin/customer)
 * PATCH /api/users/:user_id/role
 */
router.patch(
    "/:user_id/role",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.updateUserRole
);

/**
 * Xóa user
 * DELETE /api/users/:user_id
 */
router.delete(
    "/:user_id",
    AuthMiddleware.authenticate,
    AuthMiddleware.authorize("admin"),
    UserController.deleteUser
);

module.exports = router;
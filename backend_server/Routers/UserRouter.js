/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const UserAuthMiddleware = require("../Middlewares/UserAuthMiddleware");
const AdminAuthMiddleware = require("../Middlewares/AdminAuthMiddleware");
const upload = require("../Middlewares/UploadMiddleware");

/*=========================================================
    ADMIN - QUẢN LÝ USER (CRUD) - Chỉ admin mới được dùng
    Prefix: /api/admin/users
=========================================================*/

// Đặt prefix cho tất cả route trong này là /users (vì file này được mount tại /admin)
// Nếu bạn mount tại /admin thì endpoint sẽ là /api/admin/users

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả users (cả admin + customer)
 */
router.get(
    "/",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.getAllUsers
);

/**
 * GET /api/admin/users/:user_id
 * Lấy thông tin chi tiết 1 user theo ID
 */
router.get(
    "/:user_id",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.getUserById
);

/**
 * POST /api/admin/users
 * Tạo user mới (admin)
 */
router.post(
    "/",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.createUser
);

/**
 * PUT /api/admin/users/:user_id
 * Cập nhật thông tin user (admin)
 */
router.put(
    "/:user_id",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.updateUser
);

/**
 * PATCH /api/admin/users/:user_id/status
 * Cập nhật status (active / banned)
 */
router.patch(
    "/:user_id/status",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.updateUserStatus
);

/**
 * PATCH /api/admin/users/:user_id/role
 * Cập nhật role (admin / customer)
 */
router.patch(
    "/:user_id/role",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.updateUserRole
);

/**
 * DELETE /api/admin/users/:user_id
 * Xóa user (admin)
 */
router.delete(
    "/:user_id",
    AdminAuthMiddleware.authenticateAdmin,
    UserController.deleteUser
);

/*=========================================================
    PROFILE - Cho user tự quản lý hồ sơ của mình
    Prefix: /api/user
=========================================================*/

/**
 * GET /api/user/profile
 * Lấy thông tin hồ sơ của chính mình
 */
router.get(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.getUserProfile
);

/**
 * PUT /api/user/profile
 * Cập nhật hồ sơ của chính mình
 */
router.put(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.updateUserProfile
);

/**
 * POST /api/user/avatar
 * Upload ảnh đại diện (field name = "avatar")
 */
router.post(
    "/avatar",
    UserAuthMiddleware.authenticateUser,
    upload.single("avatar"),
    UserController.uploadAvatar
);

/**
 * GET /api/user/booking-history
 * Lấy lịch sử đặt vé
 */
router.get(
    "/booking-history",
    UserAuthMiddleware.authenticateUser,
    UserController.getMyBookings
);

/**
 * DELETE /api/user/booking-history
 * Xóa lịch sử đặt vé (và reset điểm)
 */
router.delete(
    "/booking-history",
    UserAuthMiddleware.authenticateUser,
    UserController.clearBookingHistory
);

/**
 * POST /api/user/reset-points
 * Reset điểm thưởng
 */
router.post(
    "/reset-points",
    UserAuthMiddleware.authenticateUser,
    UserController.resetMyPoints
);

/*=========================================================
    EXPORT
=========================================================*/

module.exports = router;
/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const UserAuthMiddleware = require("../Middlewares/UserAuthMiddleware");
const upload = require("../Middlewares/UploadMiddleware");

/*=========================================================
    ADMIN - QUẢN LÝ USER (CRUD) - Chỉ admin mới được dùng
=========================================================*/

/**
 * GET /api/users
 * Lấy danh sách tất cả users (cả admin + customer)
 */
router.get(
    "/",
    UserAuthMiddleware.authenticateAdmin,
    UserController.getAllUsers
);

/**
 * GET /api/users/:user_id
 * Lấy thông tin chi tiết 1 user theo ID
 */
router.get(
    "/:user_id",
    UserAuthMiddleware.authenticateAdmin,
    UserController.getUserById
);

/**
 * POST /api/users
 * Tạo user mới (admin)
 */
router.post(
    "/",
    UserAuthMiddleware.authenticateAdmin,
    UserController.createUser
);

/**
 * PUT /api/users/:user_id
 * Cập nhật thông tin user (admin)
 */
router.put(
    "/:user_id",
    UserAuthMiddleware.authenticateAdmin,
    UserController.updateUser
);

/**
 * PATCH /api/users/:user_id/status
 * Cập nhật status (active / banned)
 */
router.patch(
    "/:user_id/status",
    UserAuthMiddleware.authenticateAdmin,
    UserController.updateUserStatus
);

/**
 * PATCH /api/users/:user_id/role
 * Cập nhật role (admin / customer)
 */
router.patch(
    "/:user_id/role",
    UserAuthMiddleware.authenticateAdmin,
    UserController.updateUserRole
);

/**
 * DELETE /api/users/:user_id
 * Xóa user (admin)
 */
router.delete(
    "/:user_id",
    UserAuthMiddleware.authenticateAdmin,
    UserController.deleteUser
);

/*=========================================================
    PROFILE - Cho user tự quản lý hồ sơ của mình
=========================================================*/

/**
 * GET /api/users/profile
 * Lấy thông tin hồ sơ của chính mình
 */
router.get(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.getUserProfile
);

/**
 * PUT /api/users/profile
 * Cập nhật hồ sơ của chính mình
 */
router.put(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.updateUserProfile
);

/*=========================================================
    AVATAR - Upload ảnh đại diện
=========================================================*/

/**
 * POST /api/users/avatar
 * Upload ảnh đại diện (field name = "avatar")
 */
router.post(
    "/avatar",
    UserAuthMiddleware.authenticateUser,
    upload.single("avatar"),
    UserController.uploadAvatar
);

/*=========================================================
    BOOKING HISTORY - Lịch sử đặt vé
=========================================================*/

/**
 * GET /api/users/booking-history
 * Lấy lịch sử đặt vé
 */
router.get(
    "/booking-history",
    UserAuthMiddleware.authenticateUser,
    UserController.getMyBookings
);

/**
 * DELETE /api/users/booking-history
 * Xóa lịch sử đặt vé (và reset điểm)
 */
router.delete(
    "/booking-history",
    UserAuthMiddleware.authenticateUser,
    UserController.clearBookingHistory
);

/*=========================================================
    POINTS - Điểm thưởng
=========================================================*/

/**
 * POST /api/users/reset-points
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
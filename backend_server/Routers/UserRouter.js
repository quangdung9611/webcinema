/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const UserAuthMiddleware = require("../Middlewares/UserAuthMiddleware");
const upload = require("../Middlewares/UploadMiddleware"); // 👈 import upload

/*=========================================================
    PROFILE
=========================================================*/

/**
 * GET /api/users/profile
 * Lấy thông tin hồ sơ người dùng
 */
router.get(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.getUserProfile
);

/**
 * PUT /api/users/profile
 * Cập nhật hồ sơ người dùng
 */
router.put(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.updateUserProfile
);

/*=========================================================
    AVATAR
=========================================================*/

/**
 * POST /api/users/avatar
 * Cập nhật ảnh đại diện
 * - Yêu cầu file field name là "avatar"
 * - Tự động lưu vào thư mục uploads/avatars/
 */
router.post(
    "/avatar",
    UserAuthMiddleware.authenticateUser,
    upload.single("avatar"), // 👈 middleware upload
    UserController.uploadAvatar
);

/*=========================================================
    BOOKING HISTORY
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
    POINTS
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
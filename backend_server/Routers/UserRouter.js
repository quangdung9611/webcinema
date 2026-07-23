/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ✅ Đổi từ UploadMiddleware → MulterMiddleware
const upload = require("../Middlewares/MulterMiddleware");

/*=========================================================
    USER - PROFILE & BOOKING (Công khai cho user)
=========================================================*/

// Lấy thông tin cá nhân
router.get(
    "/profile",
    authenticateUser,
    UserController.getUserProfile
);

// Cập nhật thông tin cá nhân
router.put(
    "/profile",
    authenticateUser,
    UserController.updateUserProfile
);

// Upload avatar (field: user_avatar)
router.post(
    "/avatar",
    authenticateUser,
    upload.single("user_avatar"),
    UserController.uploadAvatar
);

// Lịch sử đặt vé
router.get(
    "/booking-history",
    authenticateUser,
    UserController.getMyBookings
);

// Xóa lịch sử đặt vé
router.delete(
    "/booking-history",
    authenticateUser,
    UserController.clearBookingHistory
);

// Reset điểm thưởng
router.post(
    "/reset-points",
    authenticateUser,
    UserController.resetMyPoints
);

/*=========================================================
    ADMIN - QUẢN LÝ USERS (CRUD)
=========================================================*/

// Lấy toàn bộ user
router.get(
    "/",
    authenticateAdmin,
    UserController.getAllUsers
);

// Lấy user theo ID
router.get(
    "/:user_id",
    authenticateAdmin,
    UserController.getUserById
);

// Tạo user mới (có thể upload avatar)
router.post(
    "/",
    authenticateAdmin,
    upload.single("user_avatar"),
    UserController.createUser
);

// Cập nhật user (có thể upload avatar)
router.put(
    "/:user_id",
    authenticateAdmin,
    upload.single("user_avatar"),
    UserController.updateUser
);

// Cập nhật status
router.patch(
    "/:user_id/status",
    authenticateAdmin,
    UserController.updateUserStatus
);

// Cập nhật role
router.patch(
    "/:user_id/role",
    authenticateAdmin,
    UserController.updateUserRole
);

// Xóa user
router.delete(
    "/:user_id",
    authenticateAdmin,
    UserController.deleteUser
);

module.exports = router;
const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");
const upload = require("../Middlewares/MulterMiddleware");

/*=========================================================
    🔐 USER - PIN MANAGEMENT
=========================================================*/
router.post("/setup-pin", authenticateUser, UserController.setupPin);
router.post("/verify-pin", authenticateUser, UserController.verifyPin);
router.put("/pin", authenticateUser, UserController.updatePin);
router.get("/pin-status", authenticateUser, UserController.getPinStatus);

/*=========================================================
    👤 USER - PROFILE
=========================================================*/
router.get("/profile", authenticateUser, UserController.getUserProfile);
router.put("/profile", authenticateUser, UserController.updateUserProfile);
router.post("/avatar", authenticateUser, upload.single("user_avatar"), UserController.uploadAvatar);

/*=========================================================
    📋 USER - BOOKING HISTORY
=========================================================*/
router.get("/booking-history", authenticateUser, UserController.getMyBookings);
router.delete("/booking-history", authenticateUser, UserController.clearBookingHistory);
router.post("/reset-points", authenticateUser, UserController.resetMyPoints);

/*=========================================================
    🔑 ADMIN - QUẢN LÝ USERS
=========================================================*/
// Lấy danh sách user
router.get("/", authenticateAdmin, UserController.getAllUsers);
router.get("/paginated", authenticateAdmin, UserController.getUsersWithPagination);

// Lấy chi tiết user
router.get("/:user_id", authenticateAdmin, UserController.getUserById);

// Tạo mới user
router.post("/", authenticateAdmin, upload.single("user_avatar"), UserController.createUser);

// Cập nhật user
router.put("/:user_id", authenticateAdmin, upload.single("user_avatar"), UserController.updateUser);

// Cập nhật trạng thái / role
router.patch("/:user_id/status", authenticateAdmin, UserController.updateUserStatus);
router.patch("/:user_id/role", authenticateAdmin, UserController.updateUserRole);

// Xóa user
router.delete("/:user_id", authenticateAdmin, UserController.deleteUser);

module.exports = router;
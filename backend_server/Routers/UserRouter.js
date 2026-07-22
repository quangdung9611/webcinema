/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const UserController = require("../Controllers/UserController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");
const upload = require("../Middlewares/UploadMiddleware");

/*=========================================================
    ADMIN - QUẢN LÝ USERS (CRUD)
=========================================================*/

router.get("/", authenticateAdmin, UserController.getAllUsers);
router.get("/:user_id", authenticateAdmin, UserController.getUserById);
router.post("/", authenticateAdmin, UserController.createUser);
router.put("/:user_id", authenticateAdmin, UserController.updateUser);
router.patch("/:user_id/status", authenticateAdmin, UserController.updateUserStatus);
router.patch("/:user_id/role", authenticateAdmin, UserController.updateUserRole);
router.delete("/:user_id", authenticateAdmin, UserController.deleteUser);

/*=========================================================
    USER - PROFILE & BOOKING
=========================================================*/

router.get("/profile", authenticateUser, UserController.getUserProfile);
router.put("/profile", authenticateUser, UserController.updateUserProfile);
router.post("/avatar", authenticateUser, upload.single("avatar"), UserController.uploadAvatar);
router.get("/booking-history", authenticateUser, UserController.getMyBookings);
router.delete("/booking-history", authenticateUser, UserController.clearBookingHistory);
router.post("/reset-points", authenticateUser, UserController.resetMyPoints);

module.exports = router;
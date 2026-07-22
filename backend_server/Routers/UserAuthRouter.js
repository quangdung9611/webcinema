/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const AuthController = require("../Controllers/AuthController");
const UserController = require("../Controllers/UserController");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const upload = require("../Middlewares/UploadMiddleware");

/*=========================================================
    AUTH - PUBLIC (không cần middleware)
=========================================================*/

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-otp", AuthController.verifyResetOTP);
router.post("/reset-password", AuthController.resetPassword);
router.post("/send-verification", AuthController.sendVerificationEmail);
router.get("/verify-email", AuthController.verifyEmail);

/*=========================================================
    AUTH - PRIVATE (cần authenticateUser)
=========================================================*/

router.get("/me", authenticateUser, AuthController.getMe);
router.patch("/change-password", authenticateUser, AuthController.changePassword);
router.post("/logout", authenticateUser, AuthController.logout);
router.post("/logout-all", authenticateUser, AuthController.logoutAllDevices);

/*=========================================================
    PROFILE
=========================================================*/

router.get("/profile", authenticateUser, UserController.getUserProfile);
router.put("/profile", authenticateUser, UserController.updateUserProfile);
router.post("/avatar", authenticateUser, upload.single("avatar"), UserController.uploadAvatar);

/*=========================================================
    BOOKING HISTORY
=========================================================*/

router.get("/booking-history", authenticateUser, UserController.getMyBookings);
router.delete("/booking-history", authenticateUser, UserController.clearBookingHistory);
router.post("/reset-points", authenticateUser, UserController.resetMyPoints);

module.exports = router;
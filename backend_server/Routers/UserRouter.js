/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");

const router = express.Router();

const UserController = require("../Controllers/UserController");

const UserAuthMiddleware = require("../Middlewares/UserAuthMiddleware");

/*=========================================================
    PROFILE
=========================================================*/

/**
 * GET /api/users/profile
 */
router.get(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.getUserProfile
);

/**
 * PUT /api/users/profile
 */
router.put(
    "/profile",
    UserAuthMiddleware.authenticateUser,
    UserController.updateUserProfile
);

/*=========================================================
    BOOKING HISTORY
=========================================================*/

/**
 * GET /api/users/booking-history
 */
router.get(
    "/booking-history",
    UserAuthMiddleware.authenticateUser,
    UserController.getMyBookings
);

/**
 * DELETE /api/users/booking-history
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
// routes/paymentRoute.js

const express = require("express");
const router = express.Router();

const PaymentController = require("../Controllers/PaymentController");
const BankAppController = require("../Controllers/BankAppController");

const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");

/*=========================================================
    1. TẠO ĐƠN HÀNG TẠM (BẮT BUỘC ĐĂNG NHẬP)
=========================================================*/
router.post(
    "/process",
    authenticateUser,
    PaymentController.processOrder
);

/*=========================================================
    2. LẤY THÔNG TIN ĐƠN HÀNG TẠM (BẮT BUỘC ĐĂNG NHẬP)
=========================================================*/
router.get(
    "/temp/:tempBookingId",
    authenticateUser,
    PaymentController.getTempData
);

/*=========================================================
    3. GỬI OTP THANH TOÁN
=========================================================*/
router.post(
    "/send-otp",
    authenticateUser,
    BankAppController.sendOTP
);

/*=========================================================
    4. GỬI LẠI OTP THANH TOÁN
=========================================================*/
router.post(
    "/resend-otp",
    authenticateUser,
    BankAppController.resendOtpPayment
);

/*=========================================================
    5. XÁC THỰC OTP + COMMIT BOOKING
=========================================================*/
router.post(
    "/verify-otp",
    authenticateUser,
    BankAppController.verifyOTP
);

/*=========================================================
    6. CHECK TTL PHIÊN ĐẶT VÉ
=========================================================*/
router.get(
    "/check-ttl/:tempBookingId",
    authenticateUser,
    BankAppController.checkTTL
);

/*=========================================================
    7. HỦY PHIÊN ĐẶT VÉ (TIMEOUT)
=========================================================*/
router.post(
    "/cancel-timeout",
    authenticateUser,
    BankAppController.cancelBookingTimeout
);

module.exports = router;
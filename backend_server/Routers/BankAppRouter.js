const express = require('express');
const router = express.Router();

const bankAppController =
    require('../Controllers/BankAppController');

router.post(
    '/send-otp',
    bankAppController.sendOTP
);

router.post(
    '/verify-otp',
    bankAppController.verifyOTP
);

router.post(
    '/cancel-timeout',
    bankAppController.cancelBookingTimeout
);

module.exports = router;
const express = require('express');
const router = express.Router();
const MomoController = require('../Controllers/MomoController');

// 1. Tạo đơn hàng tạm + QR MoMo
router.post('/process', MomoController.processOrder);

// 2. Gửi OTP
router.post('/send-otp', MomoController.sendOTP);

// 3. Xác thực OTP + Commit DB
router.post('/verify-otp', MomoController.verifyOTP);

// 4. Gửi lại OTP
router.post('/resend-otp', MomoController.resendOtp);

// 5. Check TTL
router.get('/check-ttl/:tempBookingId', MomoController.checkTTL);

// 6. Hủy phiên đặt vé
router.post('/cancel', MomoController.cancelBooking);

// 7. Callback từ MoMo (GIỮ NGUYÊN)
router.post('/callback', MomoController.callback);

module.exports = router;
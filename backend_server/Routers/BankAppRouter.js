const express = require('express');
const router = express.Router();
const BankAppController = require('../Controllers/BankAppController');

/**
 * 1. ROUTE GỬI MÃ OTP
 * Frontend gọi khi user vào trang nhập OTP hoặc bấm "Gửi lại mã".
 * URL: POST http://localhost:5000/api/bank/send-otp
 */
router.post('/send-otp', BankAppController.sendOTP);

/**
 * 2. ROUTE XÁC THỰC OTP & GỬI VÉ
 * Frontend gọi khi user nhập xong 6 số và bấm nút "XÁC NHẬN THANH TOÁN".
 * URL: POST http://localhost:5000/api/bank/verify-otp
 */
router.post('/verify-otp', BankAppController.verifyOTP);

module.exports = router;
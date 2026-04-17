const express = require('express');
const router = express.Router();
const BankAppController = require('../Controllers/BankAppController');

/**
 * 1. ROUTE GỬI MÃ OTP
 * Frontend gọi khi user vào trang nhập OTP hoặc bấm "Gửi lại mã".
 * URL: POST https://api.quangdungcinema.id.vn/api/bank/send-otp
 */
router.post('/send-otp', BankAppController.sendOTP);

/**
 * 2. ROUTE XÁC THỰC OTP & CHỐT ĐƠN
 * Frontend gọi khi user nhập xong 6 số và bấm nút "XÁC NHẬN THANH TOÁN".
 * URL: POST https://api.quangdungcinema.id.vn/api/bank/verify-otp
 */
router.post('/verify-otp', BankAppController.verifyOTP);

/**
 * 3. ROUTE HỦY ĐƠN KHI HẾT HẠN (MỚI)
 * Frontend gọi khi đồng hồ đếm ngược (5 phút) về 0.
 * Hệ thống sẽ tự chuyển đơn từ Pending sang Cancelled và giải phóng ghế.
 * URL: POST https://api.quangdungcinema.id.vn/api/bank/cancel-timeout
 */
router.post('/cancel-timeout', BankAppController.cancelBookingTimeout);

module.exports = router;
const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

// 1. Giai đoạn khởi tạo: Lưu đơn hàng (Pending) & Giữ ghế (Reserved)
// Gọi khi nhấn "Tiếp tục" ở trang Payment.js
router.post('/process', PaymentController.processOrder);

// 2. Route dành riêng cho MoMo Callback (IPN)
// MoMo Server sẽ tự động gọi vào đây để chốt đơn ngầm (Sử dụng executeMomoCompletion)
router.post('/callback', PaymentController.momoCallback);

// 3. Route dành riêng cho BankApp (Xác thực OTP thành công)
// Gọi từ trang BankApp.js sau khi mã OTP khớp (Sử dụng executeBankCompletion)
router.post('/complete-bank', PaymentController.completePayment);

// 4. (Tùy chọn) Route đồng bộ hóa trạng thái cho Frontend 
// Nếu ông muốn có một route chung để kiểm tra trạng thái đơn hàng sau khi thanh toán
router.post('/complete', PaymentController.completePayment); 

module.exports = router;
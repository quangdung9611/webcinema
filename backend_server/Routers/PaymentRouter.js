const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

// 1. Route lưu đơn hàng (Trạng thái Pending + Sinh mã Memo)
// Khách nhấn "Thanh toán" trên Web sẽ gọi cái này
router.post('/process', PaymentController.processOrder);

// 2. Route để Frontend (React) báo đã thanh toán thành công
// Dùng để chuyển hướng trang và hiển thị thông báo cho khách
router.post('/complete', PaymentController.completePayment); 

// 3. THÊM DÒNG NÀY: Route cho MoMo Callback (IPN) - QUAN TRỌNG NHẤT
// MoMo sẽ tự động gọi vào đây để chốt đơn ngầm
router.post('/callback', PaymentController.momoCallback);

module.exports = router;
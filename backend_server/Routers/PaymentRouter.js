const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

// 1. Route lưu đơn hàng (Trạng thái Pending + Sinh mã Memo)
// URL: POST https://webcinema-zb8z.onrender.com/api/payment/process
router.post('/process', PaymentController.processOrder);

// 2. THÊM DÒNG NÀY: Route để chốt đơn sau khi thanh toán thành công
// URL: POST https://webcinema-zb8z.onrender.com/api/payment/complete
router.post('/complete', PaymentController.completePayment); 

module.exports = router;
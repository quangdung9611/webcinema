const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

// Route lưu đơn hàng (Trạng thái Pending + Sinh mã Memo)
// URL: POST https://webcinema-zb8z.onrender.com/api/payment/process
router.post('/process', PaymentController.processOrder);

module.exports = router;
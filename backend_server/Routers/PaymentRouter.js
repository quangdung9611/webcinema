const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

// 1. Tạo đơn hàng tạm (Redis)
router.post('/process', PaymentController.processOrder);

// 2. Lấy thông tin đơn hàng tạm
router.get('/temp/:tempBookingId', PaymentController.getTempData);

module.exports = router;
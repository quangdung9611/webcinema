const express = require('express');
const router = express.Router();
// Dùng đường dẫn tương đối để lùi 1 cấp ra ngoài folder Routers rồi vào Controllers
const MomoController = require('../Controllers/MomoController'); 

// 1. Route tạo QR (MoMo thật)
router.post('/create', MomoController.createPayment);

// 2. Route xác nhận "thần tốc" để GỬI EMAIL (Frontend giả lập gọi cái này)
router.post('/confirm-fast', MomoController.confirmMomoFast);

// 3. Route nhận tín hiệu từ MoMo thật
router.post('/callback', MomoController.callback);

module.exports = router;
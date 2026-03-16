const express = require('express');
const router = express.Router();

// Bóc tách các hàm từ controller
const couponController = require('../Controllers/CouponController');

router.post('/check', couponController.checkCoupon);
router.get('/all', couponController.getAllCoupons);
router.post('/create', couponController.createCoupon);
router.put('/update/:id', couponController.updateCoupon);
router.delete('/delete/:id', couponController.deleteCoupon);

module.exports = router;
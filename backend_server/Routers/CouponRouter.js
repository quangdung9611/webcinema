const express = require('express');
const router = express.Router();
const couponController = require('../Controllers/CouponController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// Public - khách hàng kiểm tra mã (không cần auth)
router.post('/check', couponController.checkCoupon);

// Admin routes (cần auth) - GIỐNG USER/ACTOR
router.get('/', authenticateAdmin, couponController.getAllCoupons);
router.post('/', authenticateAdmin, couponController.createCoupon);
router.put('/:coupon_id', authenticateAdmin, couponController.updateCoupon);
router.delete('/:coupon_id', authenticateAdmin, couponController.deleteCoupon);

module.exports = router;
const express = require('express');
const router = express.Router();
const couponController = require('../Controllers/CouponController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// Public - khách hàng kiểm tra mã
router.post('/check', couponController.checkCoupon);

// Admin routes
router.get('/all', authenticateAdmin, couponController.getAllCoupons);
router.post('/create', authenticateAdmin, couponController.createCoupon);
router.put('/update/:id', authenticateAdmin, couponController.updateCoupon);
router.delete('/delete/:id', authenticateAdmin, couponController.deleteCoupon);

module.exports = router;
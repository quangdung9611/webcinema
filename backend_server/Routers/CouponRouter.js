const express = require('express');
const router = express.Router();
const couponController = require('../Controllers/CouponController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// =============================================================
// PUBLIC ROUTES
// =============================================================

// Kiểm tra mã giảm giá (không cần auth)
router.post('/check', couponController.checkCoupon);

// Lấy danh sách mã giảm giá KHÔNG phân trang (có thể public hoặc admin tùy nghiệp vụ)
// Nếu muốn public, bỏ authenticateAdmin; nhưng hiện tại vẫn để admin vì nhạy cảm
router.get('/', authenticateAdmin, couponController.getAllCouponsAll);

// =============================================================
// ADMIN ROUTES (cần auth)
// =============================================================

// Lấy danh sách có phân trang
router.get('/paginated', authenticateAdmin, couponController.getCouponsWithPagination);

// Tạo mã giảm giá
router.post('/', authenticateAdmin, couponController.createCoupon);

// Cập nhật mã giảm giá
router.put('/:coupon_id', authenticateAdmin, couponController.updateCoupon);

// Xóa mã giảm giá
router.delete('/:coupon_id', authenticateAdmin, couponController.deleteCoupon);

module.exports = router;
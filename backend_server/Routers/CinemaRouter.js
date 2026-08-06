const express = require('express');
const router = express.Router();
const CinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy danh sách rạp (không phân trang)
router.get('/', CinemaController.getAllCinemasAll);

// ✅ Lấy chi tiết rạp theo SLUG - dùng route riêng để tránh xung đột với admin
router.get('/detail/:slug', CinemaController.getCinemaBySlug);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy rạp có phân trang
router.get('/paginated', authenticateAdmin, CinemaController.getCinemasWithPagination);

// Lấy chi tiết rạp theo ID (admin)
router.get('/:cinema_id', authenticateAdmin, CinemaController.getCinemaById);

// Tạo rạp mới
router.post('/', authenticateAdmin, CinemaController.createCinema);

// Cập nhật rạp
router.put('/:cinema_id', authenticateAdmin, CinemaController.updateCinema);

// Xóa rạp
router.delete('/:cinema_id', authenticateAdmin, CinemaController.deleteCinema);

module.exports = router;
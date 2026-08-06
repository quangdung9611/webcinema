const express = require('express');
const router = express.Router();
const CinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy danh sách rạp (không phân trang)
router.get('/', CinemaController.getAllCinemasAll);

// Lấy chi tiết rạp theo slug (đặt SAU route ID để tránh xung đột)
router.get('/:slug', CinemaController.getCinemaBySlug);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy rạp có phân trang (đặt trước các route động)
router.get('/paginated', authenticateAdmin, CinemaController.getCinemasWithPagination);

// Lấy chi tiết rạp theo ID (chỉ nhận số, đặt trước route slug)
router.get('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.getCinemaById);

// Tạo rạp mới
router.post('/', authenticateAdmin, CinemaController.createCinema);

// Cập nhật rạp (chỉ nhận số)
router.put('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.updateCinema);

// Xóa rạp (chỉ nhận số)
router.delete('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.deleteCinema);

module.exports = router;
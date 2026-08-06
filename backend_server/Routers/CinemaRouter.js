const express = require('express');
const router = express.Router();
const CinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// 1. Lấy danh sách rạp (không phân trang) – route cụ thể nhất
router.get('/', CinemaController.getAllCinemasAll);

// 2. Lấy chi tiết rạp theo slug – chỉ nhận chuỗi chữ cái, số và dấu gạch ngang
router.get('/:slug([a-zA-Z0-9-]+)', CinemaController.getCinemaBySlug);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// 3. Lấy rạp có phân trang – route cụ thể
router.get('/paginated', authenticateAdmin, CinemaController.getCinemasWithPagination);

// 4. Lấy chi tiết rạp theo ID – chỉ nhận số, đặt TRƯỚC /:slug
router.get('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.getCinemaById);

// 5. Tạo rạp mới
router.post('/', authenticateAdmin, CinemaController.createCinema);

// 6. Cập nhật rạp – chỉ nhận số
router.put('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.updateCinema);

// 7. Xóa rạp – chỉ nhận số
router.delete('/:cinema_id(\\d+)', authenticateAdmin, CinemaController.deleteCinema);

module.exports = router;
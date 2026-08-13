const express = require('express');
const router = express.Router();
const CinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');
const upload = require('../Middlewares/MulterMiddleware');

/* ==========================================================
    PUBLIC ROUTES (không cần auth)
========================================================== */
// Lấy danh sách rạp (không phân trang)
router.get('/', CinemaController.getAllCinemasAll);

// Lấy chi tiết rạp theo SLUG
router.get('/detail/:slug', CinemaController.getCinemaBySlug);

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy rạp có phân trang
router.get('/paginated', authenticateAdmin, CinemaController.getCinemasWithPagination);

// Lấy chi tiết rạp theo ID (admin)
router.get('/:cinema_id', authenticateAdmin, CinemaController.getCinemaById);

// Tạo rạp mới – hỗ trợ upload cinema_backdrop
router.post(
    '/',
    authenticateAdmin,
    upload.fields([
        { name: 'cinema_backdrop', maxCount: 1 }
    ]),
    CinemaController.createCinema
);

// Cập nhật rạp – hỗ trợ upload cinema_backdrop
router.put(
    '/:cinema_id',
    authenticateAdmin,
    upload.fields([
        { name: 'cinema_backdrop', maxCount: 1 }
    ]),
    CinemaController.updateCinema
);

// Xóa rạp
router.delete('/:cinema_id', authenticateAdmin, CinemaController.deleteCinema);

module.exports = router;
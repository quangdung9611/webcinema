// routers/ShowtimeConfigRouter.js

const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');
const ShowtimeConfigController = require('../Controllers/ShowtimeConfigController');

/*=========================================================
    ADMIN - CẤU HÌNH LỊCH CHIẾU
=========================================================*/

// Lấy cấu hình của 1 phim ở 1 rạp
// GET /api/showtime-config/:movie_id?cinema_id=1
router.get(
    '/:movie_id',
    authenticateAdmin,
    ShowtimeConfigController.getShowtimeConfig
);

// Lưu cấu hình cho 1 phim ở 1 rạp
// POST /api/showtime-config/:movie_id
// Body: { cinema_id: 1, configs: [...] }
router.post(
    '/:movie_id',
    authenticateAdmin,
    ShowtimeConfigController.saveShowtimeConfig
);

// Cập nhật 1 cấu hình
// PUT /api/showtime-config/:movie_id/:config_id
router.put(
    '/:movie_id/:config_id',
    authenticateAdmin,
    ShowtimeConfigController.updateShowtimeConfig
);

// Xóa 1 cấu hình
// DELETE /api/showtime-config/:movie_id/:config_id
router.delete(
    '/:movie_id/:config_id',
    authenticateAdmin,
    ShowtimeConfigController.deleteShowtimeConfig
);

module.exports = router;
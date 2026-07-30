/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const BannerController = require("../Controllers/BannerController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/*=========================================================
    PUBLIC ROUTES - KHÔNG CẦN AUTH
=========================================================*/

// GET /api/banners?page=HOME → lấy banner theo page (public)
// GET /api/banners → nếu không có page → lấy tất cả banners (cho admin)
router.get(
    "/",
    BannerController.getBannerByPage
);

// GET /api/banners/:banner_id → lấy banner theo ID (public)
router.get(
    "/:banner_id",
    BannerController.getBannerById
);

/*=========================================================
    ADMIN ROUTES - CẦN AUTHENTICATE ADMIN
=========================================================*/

// Tạo banner mới
router.post(
    "/",
    authenticateAdmin,
    BannerController.createBanner
);

// Cập nhật banner
router.put(
    "/:banner_id",
    authenticateAdmin,
    BannerController.updateBanner
);

// Xóa banner
router.delete(
    "/:banner_id",
    authenticateAdmin,
    BannerController.deleteBanner
);

module.exports = router;
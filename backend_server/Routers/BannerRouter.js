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

// GET /api/banners → lấy tất cả banners
router.get(
    "/",
    BannerController.getAllBanners
);

// GET /api/banners/page/HOME → lấy banner theo page
router.get(
    "/page/:page",
    BannerController.getBannerByPage
);

// GET /api/banners/:banner_id → lấy banner theo ID
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
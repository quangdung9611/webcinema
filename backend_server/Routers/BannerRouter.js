/*=========================================================
    DEPENDENCIES
=========================================================*/

const express = require("express");
const router = express.Router();

const BannerController = require("../Controllers/BannerController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");
const upload = require("../Middlewares/MulterMiddleware");

/*=========================================================
    PUBLIC ROUTES - KHÔNG CẦN AUTH
=========================================================*/

// GET /api/banners → lấy tất cả banner (không phân trang, public)
router.get("/", BannerController.getAllBannersAll);

// GET /api/banners/:banner_id → lấy banner theo ID (public)
router.get("/:banner_id", BannerController.getBannerById);

/*=========================================================
    ADMIN ROUTES - CẦN AUTHENTICATE ADMIN
=========================================================*/

// GET /api/banners/paginated → lấy banner có phân trang (admin)
router.get("/paginated", authenticateAdmin, BannerController.getBannersWithPagination);

// Tạo banner mới (upload file field: "image_url")
router.post(
    "/",
    authenticateAdmin,
    upload.single("image_url"),
    BannerController.createBanner
);

// Cập nhật banner (upload file field: "image_url")
router.put(
    "/:banner_id",
    authenticateAdmin,
    upload.single("image_url"),
    BannerController.updateBanner
);

// Xóa banner
router.delete(
    "/:banner_id",
    authenticateAdmin,
    BannerController.deleteBanner
);

module.exports = router;
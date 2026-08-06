
const express = require("express");

const router = express.Router();

const BannerController =
    require("../Controllers/BannerController");

const {
    authenticateAdmin
} = require("../Middlewares/AdminAuthMiddleware");

const upload =
    require("../Middlewares/MulterMiddleware");


/* ==========================================================
    PUBLIC ROUTES
========================================================== */


/*
 * GET /api/banners
 *
 * Không phân trang
 *
 * Có thể:
 *
 * /api/banners
 * /api/banners?page=HOME
 * /api/banners?search=HOME
 */
router.get(
    "/",
    BannerController.getAllBannersAll
);


/* ==========================================================
    ADMIN ROUTES
========================================================== */


/*
 * GET /api/banners/paginated
 *
 * Phải đặt TRƯỚC /:banner_id
 */
router.get(
    "/paginated",
    authenticateAdmin,
    BannerController.getBannersWithPagination
);


/*
 * GET /api/banners/:banner_id
 *
 * Lấy banner theo ID
 */
router.get(
    "/:banner_id",
    BannerController.getBannerById
);


/*
 * POST /api/banners
 *
 * Tạo banner
 */
router.post(
    "/",
    authenticateAdmin,
    upload.single("image_url"),
    BannerController.createBanner
);


/*
 * PUT /api/banners/:banner_id
 *
 * Cập nhật banner
 */
router.put(
    "/:banner_id",
    authenticateAdmin,
    upload.single("image_url"),
    BannerController.updateBanner
);


/*
 * DELETE /api/banners/:banner_id
 *
 * Xóa banner
 */
router.delete(
    "/:banner_id",
    authenticateAdmin,
    BannerController.deleteBanner
);


module.exports = router;


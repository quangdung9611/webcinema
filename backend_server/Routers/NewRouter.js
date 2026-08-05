const express = require("express");
const router = express.Router();

const NewsController = require("../Controllers/NewsController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES (không cần đăng nhập)
========================================================== */
// ✅ Lấy tất cả (không phân trang) - dành cho user
router.get("/", NewsController.getAllNewsAll);

// ✅ Chi tiết theo slug
router.get("/:slug", NewsController.getNewsBySlug);

// ✅ Tăng lượt thích
router.post("/like/:news_id", NewsController.likeNews);

/* ==========================================================
   ADMIN ROUTES (cần quyền admin)
========================================================== */
// ✅ Có phân trang - dành cho admin
router.get("/paginated", authenticateAdmin, NewsController.getNewsWithPagination);

// ✅ CRUD
router.get("/:news_id", authenticateAdmin, NewsController.getNewsById);
router.post(
    "/",
    authenticateAdmin,
    upload.single("news_image"),
    NewsController.createNews
);
router.put(
    "/:news_id",
    authenticateAdmin,
    upload.single("news_image"),
    NewsController.updateNews
);
router.delete(
    "/:news_id",
    authenticateAdmin,
    NewsController.deleteNews
);

module.exports = router;
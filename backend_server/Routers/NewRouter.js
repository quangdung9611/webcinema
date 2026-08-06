const express = require("express");
const router = express.Router();

const NewsController = require("../Controllers/NewsController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES (không cần đăng nhập)
========================================================== */
// 1. Lấy tất cả (không phân trang)
router.get("/", NewsController.getAllNewsAll);

// 2. Tăng lượt thích
router.post("/like/:news_id", NewsController.likeNews);

// 3. Chi tiết theo SLUG - dùng route riêng để tránh xung đột
router.get("/detail/:slug", NewsController.getNewsBySlug);

/* ==========================================================
   ADMIN ROUTES (cần quyền admin)
========================================================== */
// 4. Có phân trang
router.get("/paginated", authenticateAdmin, NewsController.getNewsWithPagination);

// 5. Lấy chi tiết theo ID (admin)
router.get("/:news_id", authenticateAdmin, NewsController.getNewsById);

// 6. CRUD
router.post("/", authenticateAdmin, upload.single("news_image"), NewsController.createNews);
router.put("/:news_id", authenticateAdmin, upload.single("news_image"), NewsController.updateNews);
router.delete("/:news_id", authenticateAdmin, NewsController.deleteNews);

module.exports = router;
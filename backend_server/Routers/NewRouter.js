const express = require("express");
const router = express.Router();
const NewsController = require("../Controllers/NewsController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (Không cần auth - ai cũng xem được)
// ==========================================================

// Lấy danh sách tin tức (admin và khách đều xem được)
router.get("/", NewsController.getAllNewsAdmin);

// Lấy chi tiết tin tức theo ID (public)
router.get("/detail/:id", NewsController.getNewsById);

// Lấy danh sách tin tức cho client (alias)
router.get("/all", NewsController.getAllNews);

// Tăng lượt thích (public)
router.post("/like/:id", NewsController.increaseLike);

// Lấy chi tiết tin tức theo slug (public) - ĐẶT CUỐI CÙNG
router.get("/:slug", NewsController.getNewsBySlug);

// ==========================================================
// ADMIN ROUTES (Chỉ admin mới được thêm/sửa/xóa)
// ==========================================================

// Tạo tin tức mới (admin)
router.post("/", authenticateAdmin, upload.single("news_image"), NewsController.createNews);

// Cập nhật tin tức (admin)
router.put("/update/:news_id", authenticateAdmin, upload.single("news_image"), NewsController.updateNews);

// Xóa tin tức (admin)
router.delete("/:id", authenticateAdmin, NewsController.deleteNews);

module.exports = router;
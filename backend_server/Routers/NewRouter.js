const express = require("express");
const router = express.Router();
const NewsController = require("../Controllers/NewsController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// PUBLIC ROUTES (Không cần auth)
// ==========================================================

router.get("/", NewsController.getAllNewsAdmin);
router.get("/all", NewsController.getAllNews);
router.post("/like/:news_id", NewsController.increaseLike);
router.get("/:slug", NewsController.getNewsBySlug); // ĐẶT CUỐI CÙNG

// ==========================================================
// ADMIN ROUTES (Chỉ admin)
// ==========================================================

router.get("/:news_id", authenticateAdmin, NewsController.getNewsById);
router.post("/", authenticateAdmin, upload.single("news_image"), NewsController.createNews);
router.put("/:news_id", authenticateAdmin, upload.single("news_image"), NewsController.updateNews);
router.delete("/:news_id", authenticateAdmin, NewsController.deleteNews);

module.exports = router;
const express = require("express");
const router = express.Router();
const NewsController = require("../Controllers/NewsController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// ==========================================================
// ADMIN ROUTES (cần auth)
// ==========================================================
router.get("/", authenticateAdmin, NewsController.getAllNewsAdmin);
router.get("/detail/:id", authenticateAdmin, NewsController.getNewsById);
router.post("/", authenticateAdmin, upload.single("news_image"), NewsController.createNews);
router.put("/update/:news_id", authenticateAdmin, upload.single("news_image"), NewsController.updateNews);
router.delete("/:id", authenticateAdmin, NewsController.deleteNews);

// ==========================================================
// PUBLIC ROUTES (không cần auth)
// ==========================================================
router.get("/all", NewsController.getAllNews);
router.post("/like/:id", NewsController.increaseLike);
router.get("/:slug", NewsController.getNewsBySlug);

module.exports = router;
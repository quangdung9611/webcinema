const express = require("express");
const router = express.Router();
const GenreController = require("../Controllers/GenreController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
    ADMIN ROUTES (cần auth admin)
========================================================== */
// Lấy toàn bộ thể loại (không phân trang) - dùng chung cho admin và public
router.get("/", GenreController.getAllGenresAll);

// Lấy thể loại có phân trang
router.get("/paginated", authenticateAdmin, GenreController.getGenresWithPagination);

// Lấy chi tiết thể loại theo ID
router.get("/:genre_id", authenticateAdmin, GenreController.getGenreById);

// Tạo thể loại
router.post("/", authenticateAdmin, GenreController.createGenre);

// Cập nhật thể loại
router.put("/:genre_id", authenticateAdmin, GenreController.updateGenre);

// Xóa thể loại
router.delete("/:genre_id", authenticateAdmin, GenreController.deleteGenre);

module.exports = router;
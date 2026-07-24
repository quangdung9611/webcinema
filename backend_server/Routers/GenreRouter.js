const express = require("express");
const router = express.Router();
const GenreController = require("../Controllers/GenreController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/", GenreController.getAllGenres);
router.get("/:genre_id", GenreController.getGenreById); // bỏ auth

// ADMIN (cần auth) - RESTful chuẩn
router.post("/", authenticateAdmin, GenreController.createGenre);
router.put("/:genre_id", authenticateAdmin, GenreController.updateGenre);
router.delete("/:genre_id", authenticateAdmin, GenreController.deleteGenre);

module.exports = router;
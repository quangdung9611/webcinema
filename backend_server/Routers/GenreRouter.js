const express = require("express");
const router = express.Router();
const GenreController = require("../Controllers/GenreController");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

// PUBLIC (không cần auth)
router.get("/", GenreController.getAllGenres);

// ADMIN (cần auth)
router.post("/add", authenticateAdmin, GenreController.addGenre);
router.put("/update/:genre_id", authenticateAdmin, GenreController.updateGenre);
router.delete("/delete/:genre_id", authenticateAdmin, GenreController.deleteGenre);
router.get("/:genre_id", authenticateAdmin, GenreController.getGenreById);

module.exports = router;
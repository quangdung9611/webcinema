// routes/movieRoutes.js
const express = require("express");
const router = express.Router();
const MovieController = require("../Controllers/MovieController");
const upload = require("../Middlewares/MulterMiddleware");
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/*=========================================================
    USER - PUBLIC ROUTES (không cần đăng nhập)
=========================================================*/
// Lấy toàn bộ phim (không phân trang) - dành cho admin
router.get("/", MovieController.getAllMoviesAll);

router.get("/status-group", MovieController.getMoviesByStatusGroup);
router.get("/with-genre", MovieController.getMoviesWithGenre);
router.get("/category/:statusSlug", MovieController.getMoviesByStatusSlug);
router.get("/detail/:slug", MovieController.getMovieBySlug);

/*=========================================================
    ADMIN - QUẢN LÝ PHIM
=========================================================*/

// Lấy phim có phân trang (thêm route này)
router.get("/paginated", authenticateAdmin, MovieController.getMoviesWithPagination);

router.get("/:movie_id", authenticateAdmin, MovieController.getMovieById);
router.post(
    "/",
    authenticateAdmin,
    upload.fields([
        { name: "movie_poster", maxCount: 1 },
        { name: "movie_backdrop", maxCount: 1 },
    ]),
    MovieController.createMovie
);
router.put(
    "/:movie_id",
    authenticateAdmin,
    upload.fields([
        { name: "movie_poster", maxCount: 1 },
        { name: "movie_backdrop", maxCount: 1 },
    ]),
    MovieController.updateMovie
);
router.delete("/:movie_id", authenticateAdmin, MovieController.deleteMovie);

/*=========================================================
    USER - CẦN ĐĂNG NHẬP
=========================================================*/
router.patch("/like/:movie_id", authenticateUser, MovieController.likeMovie);
router.patch("/view/:movie_id", authenticateUser, MovieController.incrementViews);

module.exports = router;
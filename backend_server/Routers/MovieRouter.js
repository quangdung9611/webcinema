const express = require("express");
const router = express.Router();

const MovieController = require("../Controllers/MovieController");
const upload = require("../Middlewares/MulterMiddleware");

// Middleware phân quyền
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES (Không cần đăng nhập)
========================================================== */

// Lấy phim theo nhóm (Mega Menu)
router.get("/status-group", MovieController.getMoviesByStatusGroup);

// Lấy phim theo thể loại (?genre=slug)
router.get("/with-genre", MovieController.getMoviesWithGenre);

// Lấy phim theo trạng thái (đang chiếu / sắp chiếu)
router.get("/category/:statusSlug", MovieController.getMoviesByStatusSlug);

// Lấy danh sách tất cả phim
router.get("/", MovieController.getAllMovies);

// Lấy chi tiết phim theo slug (User)
router.get("/detail/:slug", MovieController.getMovieBySlug);

/* ==========================================================
   ADMIN ROUTES (Cần quyền Admin)
========================================================== */

// Lấy chi tiết phim theo ID
router.get("/:movie_id", authenticateAdmin, MovieController.getMovieById);

// Thêm phim
router.post(
    "/",
    authenticateAdmin,
    upload.fields([
        { name: "movie_poster", maxCount: 1 },
        { name: "movie_backdrop", maxCount: 1 },
    ]),
    MovieController.createMovie
);

// Cập nhật phim
router.put(
    "/:movie_id",
    authenticateAdmin,
    upload.fields([
        { name: "movie_poster", maxCount: 1 },
        { name: "movie_backdrop", maxCount: 1 },
    ]),
    MovieController.updateMovie
);

// Xóa phim
router.delete(
    "/:movie_id",
    authenticateAdmin,
    MovieController.deleteMovie
);

/* ==========================================================
   USER ROUTES (Cần đăng nhập)
========================================================== */

// Thích phim
router.patch(
    "/like/:movie_id",
    authenticateUser,
    MovieController.likeMovie
);

// Tăng lượt xem
router.patch(
    "/view/:movie_id",
    authenticateUser,
    MovieController.incrementViews
);

module.exports = router;
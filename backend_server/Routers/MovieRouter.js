const express = require("express");
const router = express.Router();

const MovieController = require("../Controllers/MovieController");
const upload = require("../Middlewares/MulterMiddleware");

// ✅ Import middleware phân quyền
const { authenticateUser } = require("../Middlewares/UserAuthMiddleware");
const { authenticateAdmin } = require("../Middlewares/AdminAuthMiddleware");

/* ==========================================================
   PUBLIC ROUTES (Không cần đăng nhập)
========================================================== */

// Lấy phim theo nhóm (mega menu)
router.get("/status-group", MovieController.getMoviesByStatusGroup);

// Lấy phim theo thể loại (query param ?genre=slug)
router.get("/with-genre", MovieController.getMoviesWithGenre);

// Lấy phim theo category (đang chiếu / sắp chiếu)
router.get("/category/:statusSlug", MovieController.getMoviesByStatusSlug);

// Danh sách tất cả phim
router.get("/", MovieController.getAllMovies);

// Lấy chi tiết phim theo slug (trang user) - ĐẶT CUỐI CÙNG
router.get("/:slug", MovieController.getMovieBySlug);

/* ==========================================================
   USER ROUTES (Cần đăng nhập) - Like / View
========================================================== */

// Có thể dùng authenticateUser để tracking user sau này
router.patch("/like/:id", authenticateUser, MovieController.likeMovie);
router.patch("/view/:id", authenticateUser, MovieController.incrementViews);

/* ==========================================================
   ADMIN ROUTES (Cần quyền admin)
========================================================== */

// Lấy chi tiết phim theo ID (dùng để edit)
router.get("/admin/detail/:id", authenticateAdmin, MovieController.getMovieById);

// Thêm phim
router.post(
  "/admin",
  authenticateAdmin,
  upload.fields([
    { name: "movie_poster", maxCount: 1 },
    { name: "movie_backdrop", maxCount: 1 },
  ]),
  MovieController.addMovie
);

// Cập nhật phim
router.put(
  "/admin/:id",
  authenticateAdmin,
  upload.fields([
    { name: "movie_poster", maxCount: 1 },
    { name: "movie_backdrop", maxCount: 1 },
  ]),
  MovieController.updateMovie
);

// Xóa phim
router.delete("/admin/:id", authenticateAdmin, MovieController.deleteMovie);

module.exports = router;
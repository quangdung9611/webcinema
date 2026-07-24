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

/* ==========================================================
   ADMIN ROUTES (Cần quyền admin) - RESTful chuẩn
========================================================== */

// Lấy chi tiết phim theo ID (admin)
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
router.delete("/:movie_id", authenticateAdmin, MovieController.deleteMovie);

/* ==========================================================
   USER ROUTES (Cần đăng nhập) - Like / View
========================================================== */

router.patch("/like/:movie_id", authenticateUser, MovieController.likeMovie);
router.patch("/view/:movie_id", authenticateUser, MovieController.incrementViews);

/* ==========================================================
   PUBLIC DETAIL ROUTE (ĐẶT CUỐI CÙNG)
========================================================== */

// Lấy chi tiết phim theo slug (trang user) - ĐẶT CUỐI CÙNG
// để tránh xung đột với /:movie_id (vì movie_id là số, slug là chữ)
router.get("/:slug", MovieController.getMovieBySlug);

module.exports = router;
const express = require('express');
const router = express.Router();

const movieController = require('../Controllers/MovieController');
const upload = require('../Middlewares/UploadMiddleware');

/* ==========================================================
    1. PUBLIC ROUTES (Cấu trúc tĩnh - Đặt lên đầu)
   ========================================================== */

// Lấy phim theo nhóm (mega menu)
router.get('/status-group', movieController.getMoviesByStatusGroup);

// Lấy phim theo thể loại (Hàm mới bạn vừa yêu cầu - không phân trang)
router.get('/with-genre', movieController.getMoviesWithGenre);

// Lấy phim theo category (đang chiếu / sắp chiếu)
router.get('/category/:statusSlug', movieController.getMoviesByStatusSlug);

// Pagination + filter thể loại (Giữ lại để dùng sau nếu cần)
router.get('/pagination', movieController.getMoviesPagination);

// Danh sách tất cả phim
router.get('/', movieController.getAllMovies);

/* ==========================================================
    2. INTERACTION ROUTES (LIKE / VIEW)
   ========================================================== */

router.patch('/like/:id', movieController.likeMovie);
router.patch('/view/:id', movieController.incrementViews);

/* ==========================================================
    3. ADMIN ROUTES (CRUD MOVIE)
   ========================================================== */

// Thêm phim
router.post(
    '/add',
    upload.fields([
        { name: 'posters', maxCount: 1 },
        { name: 'backdrop_url', maxCount: 1 }
    ]),
    movieController.addMovie
);

// Cập nhật phim
router.put(
    '/update/:id',
    upload.fields([
        { name: 'posters', maxCount: 1 },
        { name: 'backdrop_url', maxCount: 1 }
    ]),
    movieController.updateMovie
);

// Xóa phim
router.delete('/:id', movieController.deleteMovie);

// Lấy chi tiết phim theo ID (admin / edit)
router.get('/detail/:id', movieController.getMovieById);

/* ==========================================================
    4. PUBLIC DETAIL ROUTE (PHẢI ĐẶT CUỐI CÙNG)
   ========================================================== */

// Lấy phim theo slug (trang chi tiết user)
// Đặt cuối cùng để tránh trùng với /with-genre hoặc /status-group
router.get('/:slug', movieController.getMovieBySlug);

module.exports = router;
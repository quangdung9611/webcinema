const express = require('express');
const router = express.Router();
const ReviewController = require('../Controllers/ReviewController');
const { authenticateUser } = require('../Middlewares/UserAuthMiddleware');

// Gửi bình luận - yêu cầu đăng nhập
router.post('/', authenticateUser, ReviewController.sendReview);

// Lấy danh sách bình luận theo phim - public
router.get('/:movie_id', ReviewController.getReviewsByMovie);

// Lấy điểm trung bình - public (tùy chọn)
router.get('/rating/:movie_id', ReviewController.getMovieRating);

module.exports = router;
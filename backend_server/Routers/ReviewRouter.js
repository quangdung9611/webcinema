const express = require('express');
const router = express.Router();
const ReviewController = require('../Controllers/ReviewController');

// Gửi bình luận: POST https://api.quangdungcinema.id.vn/api/reviews
router.post('/', ReviewController.sendReview);

// Lấy danh sách bình luận: GET https://api.quangdungcinema.id.vn/api/reviews/:movie_id
router.get('/:movie_id', ReviewController.getReviewsByMovie);

module.exports = router;
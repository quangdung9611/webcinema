const express = require('express');
const router = express.Router();
const ReviewController = require('../Controllers/ReviewController');

// Khớp với URL: http://localhost:5000/api/reviews
router.post('/', ReviewController.sendReview);

module.exports = router;
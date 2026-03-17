const express = require('express');
const router = express.Router();
const ReviewController = require('../Controllers/ReviewController');

// Khớp với URL: https://webcinema-zb8z.onrender.com/api/reviews
router.post('/', ReviewController.sendReview);

module.exports = router;
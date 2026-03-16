const express = require('express');
const router = express.Router();
const FoodController = require('../Controllers/FoodController');

// Chỉ cần 1 dòng này để lấy danh sách bắp nước
router.get('/', FoodController.getAllFoods);

module.exports = router;
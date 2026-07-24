const express = require('express');
const router = express.Router();
const FoodController = require('../Controllers/FoodController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// PUBLIC (không auth)
router.get('/', FoodController.getAllFoods);
router.get('/:product_id', FoodController.getFoodById);

// ADMIN (cần auth) - RESTful chuẩn
router.post('/', authenticateAdmin, upload.single('food_image'), FoodController.createFood);
router.put('/:product_id', authenticateAdmin, upload.single('food_image'), FoodController.updateFood);
router.delete('/:product_id', authenticateAdmin, FoodController.deleteFood);

module.exports = router;
const express = require('express');
const router = express.Router();
const FoodController = require('../Controllers/FoodController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// PUBLIC (không auth)
router.get('/', FoodController.getAllFoods);
router.get('/:id', FoodController.getFoodById);

// ADMIN (cần auth)
router.post('/create', authenticateAdmin, upload.single('food_image'), FoodController.createFood);
router.put('/update/:id', authenticateAdmin, upload.single('food_image'), FoodController.updateFood);
router.delete('/delete/:id', authenticateAdmin, FoodController.deleteFood);

module.exports = router;
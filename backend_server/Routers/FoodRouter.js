const express = require('express');
const router = express.Router();

const FoodController = require('../Controllers/FoodController');
const upload = require('../Middlewares/UploadMiddleware');

/* =====================================================
    GET ALL FOODS
===================================================== */
router.get('/', FoodController.getAllFoods);

/* =====================================================
    CREATE FOOD (có upload ảnh)
===================================================== */
router.post('/create', upload.single('food_image'), FoodController.createFood);

/* =====================================================
    UPDATE FOOD (có upload ảnh)
===================================================== */
router.put('/update/:id', upload.single('food_image'), FoodController.updateFood);

/* =====================================================
    DELETE FOOD
===================================================== */
router.delete('/delete/:id', FoodController.deleteFood);

/* =====================================================
    GET FOOD BY ID (đặt cuối cùng để tránh xung đột)
===================================================== */
router.get('/:id', FoodController.getFoodById);

module.exports = router;
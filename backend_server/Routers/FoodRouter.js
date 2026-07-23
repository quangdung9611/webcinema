const express = require('express');
const router = express.Router();

const FoodController = require('../Controllers/FoodController');

// ✅ Đã sửa: dùng MulterMiddleware thay vì UploadMiddleware cũ
const upload = require('../Middlewares/MulterMiddleware');

/* =====================================================
    GET ALL FOODS
===================================================== */
router.get('/', FoodController.getAllFoods);

/* =====================================================
    CREATE FOOD (có upload ảnh lên Cloudinary)
===================================================== */
router.post('/create', upload.single('food_image'), FoodController.createFood);

/* =====================================================
    UPDATE FOOD (có upload ảnh lên Cloudinary)
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
const express = require('express');
const router = express.Router();
const FoodController = require('../Controllers/FoodController');
const upload = require('../Middlewares/MulterMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// PUBLIC - không phân trang (nếu có page/limit sẽ trả về lỗi 400)
router.get('/', FoodController.getAllFoodsAll);

// PUBLIC - có phân trang
router.get('/paginated', FoodController.getFoodsWithPagination);

// PUBLIC - lấy chi tiết
router.get('/:product_id', FoodController.getFoodById);

// ADMIN (cần auth) - RESTful chuẩn
router.post('/', authenticateAdmin, upload.single('food_image'), FoodController.createFood);
router.put('/:product_id', authenticateAdmin, upload.single('food_image'), FoodController.updateFood);
router.delete('/:product_id', authenticateAdmin, FoodController.deleteFood);

module.exports = router;
const express = require('express');

const router = express.Router();

const FoodController =
    require('../Controllers/FoodController');

/* =====================================================
    GET ALL FOODS
===================================================== */

router.get(
    '/',
    FoodController.getAllFoods
);

/* =====================================================
    GET FOOD BY ID
===================================================== */

router.get(
    '/:id',
    FoodController.getFoodById
);

/* =====================================================
    CREATE FOOD
===================================================== */

router.post(
    '/create',
    FoodController.createFood
);

/* =====================================================
    UPDATE FOOD
===================================================== */

router.put(
    '/update/:id',
    FoodController.updateFood
);

/* =====================================================
    DELETE FOOD
===================================================== */

router.delete(
    '/delete/:id',
    FoodController.deleteFood
);

module.exports = router;
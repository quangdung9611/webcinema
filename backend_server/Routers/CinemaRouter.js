const express = require('express');
const router = express.Router();
const cinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// PUBLIC
router.get('/', cinemaController.getAllCinemas);
router.get('/:slug', cinemaController.getCinemaBySlug);

// ADMIN (cần auth) - GIỐNG USER/ACTOR
router.get('/:cinema_id', authenticateAdmin, cinemaController.getCinemaById);
router.post('/', authenticateAdmin, cinemaController.createCinema);
router.put('/:cinema_id', authenticateAdmin, cinemaController.updateCinema);
router.delete('/:cinema_id', authenticateAdmin, cinemaController.deleteCinema);

module.exports = router;
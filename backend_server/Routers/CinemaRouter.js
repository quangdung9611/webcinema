const express = require('express');
const router = express.Router();
const cinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

// PUBLIC
router.get('/', cinemaController.getAllCinemas);
router.get('/:slug', cinemaController.getCinemaBySlug);

// ADMIN (cần auth)
router.get('/id/:cinema_id', authenticateAdmin, cinemaController.getCinemaById);
router.post('/add', authenticateAdmin, cinemaController.createCinema);
router.put('/update/:cinema_id', authenticateAdmin, cinemaController.updateCinema);
router.delete('/delete/:cinema_id', authenticateAdmin, cinemaController.deleteCinema);

module.exports = router;
const express = require('express');
const router = express.Router();
const CinemaController = require('../Controllers/CinemaController');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

router.param('cinema_id', (req, res, next, value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'ID rạp không hợp lệ' });
    }
    next();
});

// PUBLIC
router.get('/', CinemaController.getAllCinemasAll);
router.get('/:slug', CinemaController.getCinemaBySlug);

// ADMIN
router.get('/paginated', authenticateAdmin, CinemaController.getCinemasWithPagination);
router.get('/:cinema_id', authenticateAdmin, CinemaController.getCinemaById);
router.post('/', authenticateAdmin, CinemaController.createCinema);
router.put('/:cinema_id', authenticateAdmin, CinemaController.updateCinema);
router.delete('/:cinema_id', authenticateAdmin, CinemaController.deleteCinema);

module.exports = router;
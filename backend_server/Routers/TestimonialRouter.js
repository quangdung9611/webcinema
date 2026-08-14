const express = require('express');
const router = express.Router();
const TestimonialController = require('../Controllers/TestimonialController');
const { authenticateUser } = require('../Middlewares/UserAuthMiddleware');
const { authenticateAdmin } = require('../Middlewares/AdminAuthMiddleware');

router.get('/active', TestimonialController.getActive);
router.post('/', authenticateUser, TestimonialController.create);

router.get('/', authenticateAdmin, TestimonialController.getAll);
router.get('/:id', authenticateAdmin, TestimonialController.getById);
router.put('/:id', authenticateAdmin, TestimonialController.update);
router.delete('/:id', authenticateAdmin, TestimonialController.delete);
router.patch('/:id/toggle', authenticateAdmin, TestimonialController.toggleActive);

module.exports = router;
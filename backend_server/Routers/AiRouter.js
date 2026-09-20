const express = require('express');
const AiController = require('../Controllers/AiController');

const router = express.Router();

/* =========================================================
   POST /api/ai/chat
========================================================== */
router.post('/chat', AiController.chat);

module.exports = router;
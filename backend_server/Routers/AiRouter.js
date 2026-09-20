const express = require('express');
const AiController = require('../Controllers/AiController');

const router = express.Router();

/* =========================================================
   POST /api/ai/chat — Non-streaming
========================================================== */
router.post('/chat', AiController.chat);

/* =========================================================
   POST /api/ai/chat/stream — Streaming (SSE)
========================================================== */
router.post('/chat/stream', AiController.chatStream);

module.exports = router;
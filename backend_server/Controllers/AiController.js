const AiService = require('../Services/AiService');

class AiController {

    /* =========================================================
       POST /api/ai/chat — Non-streaming
    ========================================================= */
    async chat(req, res) {
        const { message, history = [], userName = null } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Tin nhắn không hợp lệ.' });
        }

        const cleanMessage = message.trim();

        if (cleanMessage.length === 0) {
            return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
        }

        if (cleanMessage.length > 500) {
            return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 500 ký tự).' });
        }

        const safeUserName = userName && typeof userName === 'string'
            ? userName.trim().slice(0, 50)
            : null;

        const safeHistory = Array.isArray(history)
            ? history
                .filter(h => h && typeof h.content === 'string')
                .map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: String(h.content).slice(0, 1000)
                }))
                .slice(-10)
            : [];

        const rateCheck = AiService.checkRateLimit(ip);

        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: `Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi ${rateCheck.retryAfter} giây.`
            });
        }

        const cacheKey = `${cleanMessage.toLowerCase()}__${safeHistory.length}__${safeUserName || 'guest'}`;
        const cached = AiService.getCache(cacheKey);

        if (cached) {
            return res.json({
                reply: cached.reply,
                movies: cached.movies,
                cached: true
            });
        }

        try {
            const result = await AiService.chat({
                message: cleanMessage,
                history: safeHistory,
                userName: safeUserName
            });

            if (result && result.reply) {
                AiService.setCache(cacheKey, result);
            }

            return res.json(result);

        } catch (error) {
            console.error('[AI Controller] Error:', error?.message);

            if (error?.status === 429) {
                return res.status(429).json({ error: 'AI đang bận, vui lòng thử lại sau vài giây.' });
            }

            return res.status(500).json({ error: 'Không thể kết nối AI. Vui lòng thử lại.' });
        }
    }

    /* =========================================================
       POST /api/ai/chat/stream — STREAMING
    ========================================================= */
    async chatStream(req, res) {
        const { message, history = [], userName = null } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Tin nhắn không hợp lệ.' });
        }

        const cleanMessage = message.trim();

        if (cleanMessage.length > 500) {
            return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 500 ký tự).' });
        }

        const safeUserName = userName && typeof userName === 'string'
            ? userName.trim().slice(0, 50)
            : null;

        const safeHistory = Array.isArray(history)
            ? history
                .filter(h => h && typeof h.content === 'string')
                .map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: String(h.content).slice(0, 1000)
                }))
                .slice(-10)
            : [];

        const rateCheck = AiService.checkRateLimit(ip);

        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: `Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi ${rateCheck.retryAfter} giây.`
            });
        }

        /* ============ SETUP SSE ============ */
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        /* ============ STREAM ============ */
        try {
            for await (const chunk of AiService.chatStream({
                message: cleanMessage,
                history: safeHistory,
                userName: safeUserName
            })) {
                if (chunk.type === 'text') {
                    res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`);
                } else if (chunk.type === 'done') {
                    res.write(`data: ${JSON.stringify({ type: 'done', movies: chunk.movies })}\n\n`);
                }
            }
        } catch (error) {
            console.error('[AI Controller] Stream error:', error?.message);

            res.write(`data: ${JSON.stringify({
                type: 'error',
                message: error?.status === 429
                    ? 'AI đang bận, vui lòng thử lại sau vài giây.'
                    : 'Không thể kết nối AI. Vui lòng thử lại.'
            })}\n\n`);
        } finally {
            res.end();
        }
    }
}

module.exports = new AiController();
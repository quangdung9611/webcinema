const AiService = require('../Services/AiService');

class AiController {

    /* =========================================================
       POST /api/ai/chat
    ========================================================= */
    async chat(req, res) {
        const { message, history = [], userName = null } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        /* ---------- Validate message ---------- */
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Tin nhắn không hợp lệ.'
            });
        }

        const cleanMessage = message.trim();

        if (cleanMessage.length === 0) {
            return res.status(400).json({
                error: 'Tin nhắn không được để trống.'
            });
        }

        if (cleanMessage.length > 500) {
            return res.status(400).json({
                error: 'Tin nhắn quá dài (tối đa 500 ký tự).'
            });
        }

        /* ---------- Validate userName ---------- */
        const safeUserName = userName && typeof userName === 'string'
            ? userName.trim().slice(0, 50)
            : null;

        /* ---------- Validate history ---------- */
        const safeHistory = Array.isArray(history)
            ? history
                .filter(h => h && typeof h.content === 'string')
                .map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: String(h.content).slice(0, 1000)
                }))
                .slice(-10)
            : [];

        /* ---------- Rate limit ---------- */
        const rateCheck = AiService.checkRateLimit(ip);

        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: `Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi ${rateCheck.retryAfter} giây.`
            });
        }

        /* ---------- Cache ---------- */
        const cacheKey = `${cleanMessage.toLowerCase()}__${safeHistory.length}__${safeUserName || 'guest'}`;
        const cached = AiService.getCache(cacheKey);

        if (cached) {
            return res.json({
                reply: cached.reply,
                movies: cached.movies,
                cached: true
            });
        }

        /* ---------- Gọi AI Service ---------- */
        try {
            const result = await AiService.chat({
                message: cleanMessage,
                history: safeHistory,
                userName: safeUserName
            });

            /* ---------- Lưu cache ---------- */
            if (result && result.reply) {
                AiService.setCache(cacheKey, result);
            }

            return res.json(result);

        } catch (error) {
            console.error('[AI Controller] Gemini API error:', error?.message);

            if (error?.status === 429) {
                return res.status(429).json({
                    error: 'AI đang bận, vui lòng thử lại sau vài giây.'
                });
            }

            if (
                error?.code === 'ETIMEDOUT' ||
                error?.code === 'ECONNABORTED' ||
                error?.code === 'UND_ERR_CONNECT_TIMEOUT'
            ) {
                return res.status(504).json({
                    error: 'AI phản hồi quá lâu. Vui lòng thử lại.'
                });
            }

            return res.status(500).json({
                error: 'Không thể kết nối AI. Vui lòng thử lại.'
            });
        }
    }
}

module.exports = new AiController();
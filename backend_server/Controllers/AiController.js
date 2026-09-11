const AiService = require('../Services/AiService');

class AiController {

    /* =========================================================
       POST /api/ai/chat
    ========================================================= */
    async chat(req, res) {
        const { message, history = [] } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        /* ---------- Validate ---------- */
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Tin nhắn không hợp lệ.'
            });
        }

        if (message.length > 500) {
            return res.status(400).json({
                error: 'Tin nhắn quá dài (tối đa 500 ký tự).'
            });
        }

        /* ---------- Rate limit ---------- */
        const rateCheck = AiService.checkRateLimit(ip);

        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: `Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi ${rateCheck.retryAfter} giây.`
            });
        }

        /* ---------- Cache ---------- */
        const cacheKey = message.trim().toLowerCase();
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
            const result = await AiService.chat({ message, history });

            /* ---------- Lưu cache ---------- */
            if (result.movies.length > 0 || result.reply) {
                AiService.setCache(cacheKey, result);
            }

            return res.json(result);

        } catch (error) {
            console.error('Groq API error:', error);

            if (error?.status === 429) {
                return res.status(429).json({
                    error: 'AI đang bận, vui lòng thử lại sau vài giây.'
                });
            }

            return res.status(500).json({
                error: 'Không thể kết nối AI. Vui lòng thử lại.'
            });
        }
    }
}

module.exports = new AiController();
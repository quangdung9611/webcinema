const express = require('express');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');

const movieRepository = require('../Repositories/MovieRepository');
// ⚠️ Sửa path '../Repositories/MovieRepository' nếu repo nằm chỗ khác

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   IN-MEMORY CACHE + RATE LIMIT
========================================================== */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 phút

const rateLimit = new Map();
const RATE_LIMIT = 10;          // 10 câu / phút / IP
const RATE_WINDOW = 1000 * 60;

/* =========================================================
   POST /api/ai/chat
========================================================== */
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  /* ---------- Validate ---------- */
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Tin nhắn không hợp lệ.' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 500 ký tự).' });
  }

  /* ---------- Rate limit ---------- */
  const now = Date.now();
  const rl = rateLimit.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + RATE_WINDOW;
  }

  if (rl.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi 1 phút.'
    });
  }

  rl.count++;
  rateLimit.set(ip, rl);

  /* ---------- Cache ---------- */
  const cacheKey = message.trim().toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.ts < CACHE_TTL) {
    return res.json({
      reply: cached.reply,
      movies: cached.movies,
      cached: true
    });
  }

  try {
    /* ---------- Lấy phim đang chiếu (kèm genres) ---------- */
    const movies = await movieRepository.findNowShowingWithGenres(30);

    if (!movies || movies.length === 0) {
      return res.json({
        reply: 'Hiện tại rạp chưa có phim nào đang chiếu. Bạn quay lại sau nhé!',
        movies: []
      });
    }

    /* ---------- Build text cho prompt ---------- */
    const movieListText = movies.map(m => {
      const genres = (m.genres || []).join(', ') || 'N/A';

      const desc = (m.description || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
        .slice(0, 100);

      return `- ID ${m.movie_id}: "${m.title}" — Thể loại: ${genres}, ${m.duration || '?'} phút, Giới hạn: T${m.age_rating || 0}. Mô tả: ${desc}`;
    }).join('\n');

    /* ---------- System prompt ---------- */
    const systemPrompt = `Bạn là "Cinema Assistant" — trợ lý tư vấn phim của Quang Dũng Cinema.

Nhiệm vụ:
- Gợi ý phim phù hợp dựa trên sở thích, tâm trạng, độ tuổi của khách.
- Trả lời thân thiện, ngắn gọn (tối đa 3 câu), tiếng Việt tự nhiên.
- Kết thúc bằng câu hỏi gợi mở (VD: "Bạn muốn xem suất mấy giờ?").

Ràng buộc BẮT BUỘC:
- CHỈ được gợi ý phim trong danh sách bên dưới.
- KHÔNG bịa tên phim, KHÔNG bịa suất chiếu.
- Nếu không có phim phù hợp → nói thật là chưa có.
- Nếu user hỏi ngoài chủ đề phim → từ chối lịch sự.

Danh sách phim hiện có:
${movieListText}

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "reply": "câu trả lời tiếng Việt",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim nào, để movie_ids = [].`;

    /* ---------- Gọi Groq API ---------- */
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6),
        { role: 'user', content: message }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    });

    /* ---------- Parse JSON ---------- */
    let aiResponse;
    try {
      aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    } catch {
      aiResponse = {
        reply: chatCompletion.choices[0].message.content,
        movie_ids: []
      };
    }

    /* ---------- Validate movie_ids ---------- */
    const validIds = (aiResponse.movie_ids || [])
      .map(Number)
      .filter(id => movies.some(m => m.movie_id === id));

    const suggestedMovies = movies
      .filter(m => validIds.includes(m.movie_id))
      .slice(0, 3)
      .map(m => ({
        movie_id: m.movie_id,
        title: m.title,
        slug: m.slug,
        movie_poster: m.movie_poster,
        duration: m.duration,
        age_rating: m.age_rating,
        genres: m.genres || []
      }));

    /* ---------- Lưu cache ---------- */
    cache.set(cacheKey, {
      reply: aiResponse.reply,
      movies: suggestedMovies,
      ts: now
    });

    // Dọn cache nếu quá 500 entry
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      cache.delete(oldest[0]);
    }

    res.json({
      reply: aiResponse.reply,
      movies: suggestedMovies
    });

  } catch (error) {
    console.error('Groq API error:', error);

    if (error?.status === 429) {
      return res.status(429).json({
        error: 'AI đang bận, vui lòng thử lại sau vài giây.'
      });
    }

    res.status(500).json({
      error: 'Không thể kết nối AI. Vui lòng thử lại.'
    });
  }
});

module.exports = router;
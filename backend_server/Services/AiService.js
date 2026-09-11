const Groq = require('groq-sdk');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GROQ CLIENT
========================================================== */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   CACHE + RATE LIMIT
========================================================== */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 phút

const rateLimit = new Map();
const RATE_LIMIT = 10;             // 10 câu/phút/IP
const RATE_WINDOW = 1000 * 60;

/* =========================================================
   AI SERVICE
========================================================== */
class AiService {

    /* -------------------------------------------------------
       CHECK RATE LIMIT
       Return: { allowed: true } | { allowed: false, retryAfter }
    ------------------------------------------------------- */
    checkRateLimit(ip) {
        const now = Date.now();
        const rl = rateLimit.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

        if (now > rl.resetAt) {
            rl.count = 0;
            rl.resetAt = now + RATE_WINDOW;
        }

        if (rl.count >= RATE_LIMIT) {
            return {
                allowed: false,
                retryAfter: Math.ceil((rl.resetAt - now) / 1000)
            };
        }

        rl.count++;
        rateLimit.set(ip, rl);
        return { allowed: true };
    }

    /* -------------------------------------------------------
       GET FROM CACHE
    ------------------------------------------------------- */
    getCache(key) {
        const cached = cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.ts > CACHE_TTL) {
            cache.delete(key);
            return null;
        }

        return cached;
    }

    /* -------------------------------------------------------
       SET CACHE
    ------------------------------------------------------- */
    setCache(key, value) {
        cache.set(key, { ...value, ts: Date.now() });

        // Dọn cache nếu quá 500 entry
        if (cache.size > 500) {
            const oldest = [...cache.entries()]
                .sort((a, b) => a[1].ts - b[1].ts)[0];
            cache.delete(oldest[0]);
        }
    }

    /* -------------------------------------------------------
       BUILD PROMPT
    ------------------------------------------------------- */
    buildSystemPrompt(movies) {
        const movieListText = movies.map(m => {
            const genres = (m.genres || []).join(', ') || 'N/A';
            const desc = (m.description || '')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .slice(0, 100);

            return `- ID ${m.movie_id}: "${m.title}" — Thể loại: ${genres}, ${m.duration || '?'} phút, Giới hạn: T${m.age_rating || 0}. Mô tả: ${desc}`;
        }).join('\n');

        return `Bạn là "Cinema Assistant" — trợ lý tư vấn phim của Quang Dũng Cinema.

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
    }

    /* -------------------------------------------------------
       MAIN: CHAT WITH AI
    ------------------------------------------------------- */
    async chat({ message, history = [] }) {
        /* ---------- 1. Lấy phim đang chiếu ---------- */
        const movies = await MovieRepository.findNowShowingWithGenres(30);

        if (!movies || movies.length === 0) {
            return {
                reply: 'Hiện tại rạp chưa có phim nào đang chiếu. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        /* ---------- 2. Build prompt ---------- */
        const systemPrompt = this.buildSystemPrompt(movies);

        /* ---------- 3. Gọi Groq ---------- */
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

        /* ---------- 4. Parse JSON ---------- */
        let aiResponse;
        try {
            aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
        } catch {
            aiResponse = {
                reply: chatCompletion.choices[0].message.content,
                movie_ids: []
            };
        }

        /* ---------- 5. Validate movie_ids ---------- */
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

        return {
            reply: aiResponse.reply,
            movies: suggestedMovies
        };
    }
}

module.exports = new AiService();
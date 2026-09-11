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
const RATE_LIMIT = 10;
const RATE_WINDOW = 1000 * 60;

/* =========================================================
   AI SERVICE
========================================================== */
class AiService {

    /* -------------------------------------------------------
       CHECK RATE LIMIT
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

        if (cache.size > 500) {
            const oldest = [...cache.entries()]
                .sort((a, b) => a[1].ts - b[1].ts)[0];
            cache.delete(oldest[0]);
        }
    }

    /* -------------------------------------------------------
       BUILD PROMPT — từ context đầy đủ
    ------------------------------------------------------- */
    buildSystemPrompt(context) {
        const { movies, showtimes, cinemas, prices, promotions, products } = context;

        /* ---------- Movies (kèm genres) ---------- */
        const movieList = movies.map(m => {
            const desc = (m.description || '')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .slice(0, 80);

            return `- ID ${m.movie_id}: "${m.title}" [${m.status}] | Thể loại: ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ${m.nation} | ĐD: ${m.director} | ${desc}`;
        }).join('\n');

        /* ---------- Showtimes (gom theo phim) ---------- */
        const showtimeByMovie = {};
        showtimes.forEach(s => {
            if (!showtimeByMovie[s.movie_id]) {
                showtimeByMovie[s.movie_id] = {
                    title: s.movie_title,
                    slots: []
                };
            }
            showtimeByMovie[s.movie_id].slots.push(
                `${s.start_time} | ${s.cinema_name} | ${s.room_name}`
            );
        });

        const showtimeList = Object.entries(showtimeByMovie)
            .map(([movieId, data]) =>
                `📽️ ${data.title} (ID ${movieId}):\n   ${data.slots.slice(0, 10).join('\n   ')}`
            )
            .join('\n\n') || 'Chưa có suất chiếu nào trong 7 ngày tới.';

        /* ---------- Cinemas ---------- */
        const cinemaList = cinemas.map(c =>
            `- ${c.cinema_name}: ${c.address} | Hotline: ${c.hotline} | T2-T6: ${c.weekday_open}–${c.weekday_close} | T7-CN: ${c.weekend_open}–${c.weekend_close}`
        ).join('\n');

        /* ---------- Prices — 5 HẠNG GHẾ ---------- */
        const priceGroups = {};
        prices.forEach(p => {
            const key = `${p.room_type} | ${p.day_type} | ${p.time_slot}`;
            if (!priceGroups[key]) priceGroups[key] = [];
            priceGroups[key].push(
                `${p.seat_type}: ${Number(p.price).toLocaleString('vi-VN')}đ`
            );
        });
        const priceList = Object.entries(priceGroups)
            .map(([k, v]) => `- ${k} → ${v.join(' | ')}`)
            .join('\n');

        /* ---------- Promotions ---------- */
        const promoList = promotions.map(p => {
            const desc = (p.description || '')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .slice(0, 100);
            return `- ${p.title}: ${desc}`;
        }).join('\n') || 'Hiện chưa có khuyến mãi.';

        /* ---------- Products ---------- */
        const productList = products.map(p =>
            `- ${p.product_name} (${p.category}): ${Number(p.price).toLocaleString('vi-VN')}đ`
        ).join('\n');

        /* ---------- Full prompt ---------- */
        return `Bạn là "Cinema Assistant" — trợ lý tư vấn của Quang Dũng Cinema.

NHIỆM VỤ:
- Tư vấn phim, suất chiếu, giá vé (theo loại phòng + hạng ghế), khuyến mãi,
  combo, địa chỉ rạp, giờ mở cửa.
- Trả lời thân thiện, ngắn gọn (tối đa 4 câu), tiếng Việt tự nhiên.
- Kết thúc bằng câu hỏi gợi mở.

RÀNG BUỘC BẮT BUỘC:
- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim, giá, suất chiếu, địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng, booking, tài khoản.
- Nếu không có thông tin → nói thật là chưa có.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.

GIẢI THÍCH VỀ GIÁ VÉ:
- "Loại phòng": 2D, 3D, VIP, 4DMAX, IMAX → khác nhau về công nghệ chiếu.
- "Hạng ghế": STANDARD (thường), VIP (cao cấp), DELUXE (sang),
  RECLINER (nằm), COUPLE (đôi) → khác nhau về vị trí + tiện nghi.
- "Khung giờ": MORNING (sáng), AFTERNOON (chiều),
  EVENING (tối), NIGHT (khuya).
- "Ngày": WEEKDAY (T2-T6), WEEKEND (T7-CN).

Khi user hỏi giá, hãy nêu RÕ cả 3 yếu tố: loại phòng + khung giờ + hạng ghế.
VD: "Ghế VIP phòng 2D suất tối cuối tuần là 135,000đ"

═══════════════════════════════════════════
📽️ PHIM (ĐANG CHIẾU + SẮP CHIẾU):
${movieList}

🎬 SUẤT CHIẾU 7 NGÀY TỚI:
${showtimeList}

🏢 HỆ THỐNG RẠP:
${cinemaList}

💰 BẢNG GIÁ VÉ (loại phòng | ngày | khung giờ → hạng ghế: giá):
${priceList}

🎁 KHUYẾN MÃI ĐANG CHẠY:
${promoList}

🍿 COMBO BẮP NƯỚC:
${productList}
═══════════════════════════════════════════

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "reply": "câu trả lời tiếng Việt",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim cụ thể, để movie_ids = [].`;
    }

    /* -------------------------------------------------------
       MAIN: CHAT WITH AI
    ------------------------------------------------------- */
    async chat({ message, history = [] }) {
        /* ---------- 1. Lấy context đầy đủ ---------- */
        const context = await MovieRepository.getFullContextForAI();

        if (!context.movies || context.movies.length === 0) {
            return {
                reply: 'Hiện tại rạp chưa có phim nào đang chiếu. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        /* ---------- 2. Build prompt ---------- */
        const systemPrompt = this.buildSystemPrompt(context);

        /* ---------- 3. Gọi Groq ---------- */
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6),
                { role: 'user', content: message }
            ],
            model: 'openai/gpt-oss-20b',
            temperature: 0.7,
            max_tokens: 500,
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
            .filter(id => context.movies.some(m => m.movie_id === id));

        const suggestedMovies = context.movies
            .filter(m => validIds.includes(m.movie_id))
            .slice(0, 3)
            .map(m => ({
                movie_id: m.movie_id,
                title: m.title,
                slug: m.slug,
                movie_poster: m.movie_poster,
                duration: m.duration,
                age_rating: m.age_rating,
                genres: m.genres ? m.genres.split(', ') : []
            }));

        return {
            reply: aiResponse.reply,
            movies: suggestedMovies
        };
    }
}

module.exports = new AiService();
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
const CACHE_TTL = 1000 * 60 * 30;

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
       BUILD PROMPT — GỌN + CÓ VÍ DỤ
    ------------------------------------------------------- */
    buildSystemPrompt(context) {
        const {
            movies, showtimes, cinemas,
            priceSummary, priceStandard,
            promotions, products
        } = context;

        /* ---------- Movies ---------- */
        const movieList = movies.map(m => {
            const desc = (m.description || '')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .slice(0, 60);

            return `- ID ${m.movie_id}: "${m.title}" [${m.status}] | ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ${m.director}`;
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
                `📽️ ${data.title} (ID ${movieId}):\n   ${data.slots.slice(0, 8).join('\n   ')}`
            )
            .join('\n\n') || 'Chưa có suất chiếu nào trong 7 ngày tới.';

        /* ---------- Cinemas ---------- */
        const cinemaList = cinemas.map(c =>
            `- ${c.cinema_name}: ${c.address} | Hotline: ${c.hotline}`
        ).join('\n');

        /* ---------- PRICE SUMMARY (theo hạng ghế) ---------- */
        const summaryGroups = {};
        priceSummary.forEach(p => {
            if (!summaryGroups[p.room_type]) summaryGroups[p.room_type] = [];
            const min = Number(p.min_price).toLocaleString('vi-VN');
            const max = Number(p.max_price).toLocaleString('vi-VN');
            const range = p.min_price === p.max_price ? `${min}đ` : `${min}đ - ${max}đ`;
            summaryGroups[p.room_type].push(`${p.seat_type}: ${range}`);
        });

        const priceSummaryList = Object.entries(summaryGroups)
            .map(([room, list]) => `- ${room} → ${list.join(' | ')}`)
            .join('\n');

        /* ---------- PRICE STANDARD (theo phòng + ngày + giờ) ---------- */
        const standardGroups = {};
        priceStandard.forEach(p => {
            const key = `${p.room_type} | ${p.day_type}`;
            if (!standardGroups[key]) standardGroups[key] = [];
            standardGroups[key].push(`${p.time_slot}: ${Number(p.price).toLocaleString('vi-VN')}đ`);
        });

        const priceStandardList = Object.entries(standardGroups)
            .map(([k, v]) => `- ${k} → ${v.join(' | ')}`)
            .join('\n');

        /* ---------- Promotions ---------- */
        const promoList = promotions.map(p => {
            const desc = (p.description || '')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .slice(0, 80);
            return `- ${p.title}: ${desc}`;
        }).join('\n') || 'Hiện chưa có khuyến mãi.';

        /* ---------- Products ---------- */
        const productList = products.map(p =>
            `- ${p.product_name} (${p.category}): ${Number(p.price).toLocaleString('vi-VN')}đ`
        ).join('\n');

        /* ---------- Full prompt ---------- */
        return `Bạn là "Cinema Assistant" — trợ lý tư vấn của Quang Dũng Cinema.

NHIỆM VỤ:
Tư vấn phim, suất chiếu, giá vé, khuyến mãi, combo, địa chỉ rạp.

RÀNG BUỘC:
- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim, giá, suất chiếu, địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng, booking, tài khoản.
- Nếu không có thông tin → nói thật là chưa có.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.
- Trả lời TỐI ĐA 4 câu. Không lan man.

QUY TẮC TRẢ LỜI GIÁ VÉ:
- Rạp CÓ 4 loại phòng: 2D, 3D, VIP, IMAX. KHÔNG CÓ 4DMAX.
- Có 5 hạng ghế: STANDARD, VIP, DELUXE, RECLINER, COUPLE.
- Có 4 khung giờ: MORNING (sáng), AFTERNOON (chiều), EVENING (tối), NIGHT (khuya).
- Có 2 loại ngày: WEEKDAY (T2-T6), WEEKEND (T7-CN).

Khi user hỏi giá:
1. Nếu hỏi CHUNG ("Ghế VIP bao nhiêu?") → trả lời RANGE giá + hỏi lại phòng/giờ cụ thể.
2. Nếu hỏi CỤ THỂ ("2D tối T7 ghế VIP") → trả lời CHÍNH XÁC 1 con số.
3. Luôn nêu rõ: hạng ghế + loại phòng + khung giờ + ngày.

═══════════════════════════════════════════
📽️ PHIM:
${movieList}

🎬 SUẤT CHIẾU 7 NGÀY TỚI:
${showtimeList}

🏢 RẠP:
${cinemaList}

💰 TÓM TẮT GIÁ THEO HẠNG GHẾ (mỗi phòng):
${priceSummaryList}

💰 GIÁ GHẾ STANDARD (theo phòng + ngày + khung giờ):
${priceStandardList}

🎁 KHUYẾN MÃI:
${promoList}

🍿 COMBO:
${productList}

═══════════════════════════════════════════
📌 VÍ DỤ TRẢ LỜI ĐÚNG:

User: "Ghế VIP giá bao nhiêu?"
Bot: "Ghế VIP có giá từ 75.000đ (2D sáng ngày thường) đến 495.000đ (IMAX đêm cuối tuần). Bạn muốn xem phòng nào và suất mấy giờ để mình báo giá chính xác?"

User: "2D tối thứ 7 ghế đôi bao nhiêu?"
Bot: "Ghế COUPLE phòng 2D suất EVENING cuối tuần là 270.000đ. Bạn muốn đặt vé luôn không?"

User: "Phim Thỏ Ơi chiếu mấy giờ?"
Bot: "Phim **Thỏ Ơi** có các suất chiếu:
- 14:00 - Galaxy Nguyễn Du - Phòng 2D 01
- 16:30 - Galaxy Tân Bình - Phòng 2D 03
- 19:00 - Galaxy Quang Trung - Phòng 2D 02
Bạn muốn xem suất nào?"

User: "Rạp có phòng 4DMAX không?"
Bot: "Rạp hiện có 4 loại phòng: 2D, 3D, VIP và IMAX. Chưa có phòng 4DMAX bạn nhé."

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
        const context = await MovieRepository.getFullContextForAI();

        if (!context.movies || context.movies.length === 0) {
            return {
                reply: 'Hiện tại rạp chưa có phim nào đang chiếu. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        const systemPrompt = this.buildSystemPrompt(context);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6),
                { role: 'user', content: message }
            ],
            model: 'openai/gpt-oss-20b',
            temperature: 0.6,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        let aiResponse;
        try {
            aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
        } catch {
            aiResponse = {
                reply: chatCompletion.choices[0].message.content,
                movie_ids: []
            };
        }

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
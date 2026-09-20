const Groq = require('groq-sdk');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GROQ CLIENT
========================================================== */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   CONFIG
========================================================== */
const MODEL = 'llama-3.3-70b-versatile';
const TEMPERATURE = 0.3;
const MAX_TOKENS = 800;

const CACHE_TTL = 1000 * 60 * 30;      // 30 phút
const CACHE_MAX_SIZE = 500;

const RATE_LIMIT = 10;                  // 10 tin
const RATE_WINDOW = 1000 * 60;          // mỗi 1 phút

/* =========================================================
   CACHE + RATE LIMIT
========================================================== */
const cache = new Map();
const rateLimit = new Map();

/* =========================================================
   AUTO CLEANUP CACHE — Mỗi 10 phút
========================================================== */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of cache.entries()) {
        if (now - value.ts > CACHE_TTL) {
            cache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 [AI Cache] Cleaned ${cleaned} expired entries`);
    }
}, 1000 * 60 * 10);

/* =========================================================
   AI SERVICE
========================================================== */
class AiService {

    /* -------------------------------------------------------
       CHECK RATE LIMIT
    ------------------------------------------------------- */
    checkRateLimit(ip) {
        const now = Date.now();
        const rl = rateLimit.get(ip) || {
            count: 0,
            resetAt: now + RATE_WINDOW
        };

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

        if (cache.size > CACHE_MAX_SIZE) {
            const oldest = [...cache.entries()]
                .sort((a, b) => a[1].ts - b[1].ts)[0];

            if (oldest) cache.delete(oldest[0]);
        }
    }

    /* -------------------------------------------------------
       DETECT INTENT — Phân loại câu hỏi của user
    ------------------------------------------------------- */
    detectIntent(message) {
        const lower = message.toLowerCase();

        // Giá vé
        if (/(giá|bao nhiêu|price|vé|tiền|đồng|vnd)/.test(lower)) {
            return 'price';
        }

        // Suất chiếu / giờ
        if (/(suất|giờ|mấy giờ|khi nào|chiếu lúc|showtime|time)/.test(lower)) {
            return 'showtime';
        }

        // Rạp / địa chỉ
        if (/(rạp|địa chỉ|ở đâu|hotline|đường|quận|thành phố|address)/.test(lower)) {
            return 'cinema';
        }

        // Khuyến mãi / combo
        if (/(khuyến mãi|giảm giá|ưu đãi|combo|bắp|nước|promo|voucher)/.test(lower)) {
            return 'promotion';
        }

        // Phim / gợi ý
        if (/(phim|đang chiếu|sắp chiếu|hay|gợi ý|đề xuất|thể loại|movie)/.test(lower)) {
            return 'movie';
        }

        return 'general';
    }

    /* -------------------------------------------------------
       BUILD PROMPT — DYNAMIC theo intent
    ------------------------------------------------------- */
    buildSystemPrompt(context, intent) {
        const {
            movies, showtimes, cinemas,
            priceSummary, priceStandard,
            promotions, products
        } = context;

        /* ---------- Header chung ---------- */
        const header = `Bạn là "Cinema Assistant" — trợ lý tư vấn của Quang Dũng Cinema.

NHIỆM VỤ:
Tư vấn phim, suất chiếu, giá vé, khuyến mãi, combo, địa chỉ rạp.

RÀNG BUỘC:
- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim, giá, suất chiếu, địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng, booking, tài khoản.
- Nếu không có thông tin → nói thật là chưa có.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.
- Trả lời TỐI ĐA 4 câu. Không lan man.
- Trả lời bằng tiếng Việt tự nhiên, thân thiện.

QUY TẮC CHUNG:
- Rạp CÓ 4 loại phòng: 2D, 3D, VIP, IMAX. KHÔNG CÓ 4DMAX.
- Có 5 hạng ghế: STANDARD, VIP, DELUXE, RECLINER, COUPLE.
- Có 4 khung giờ: MORNING (sáng), AFTERNOON (chiều), EVENING (tối), NIGHT (khuya).
- Có 2 loại ngày: WEEKDAY (T2-T6), WEEKEND (T7-CN).
`;

        /* ---------- Data sections (chỉ include data liên quan) ---------- */
        let dataSections = '';

        /* === ALWAYS include movies list (AI cần biết có phim gì) === */
        const movieList = movies.map(m =>
            `- ID ${m.movie_id}: "${m.title}" [${m.status}] | ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ${m.director}`
        ).join('\n');

        dataSections += `\n📽️ DANH SÁCH PHIM:\n${movieList}\n`;

        /* === INTENT: PRICE === */
        if (intent === 'price') {
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

            const standardGroups = {};
            priceStandard.forEach(p => {
                const key = `${p.room_type} | ${p.day_type}`;
                if (!standardGroups[key]) standardGroups[key] = [];
                standardGroups[key].push(
                    `${p.time_slot}: ${Number(p.price).toLocaleString('vi-VN')}đ`
                );
            });

            const priceStandardList = Object.entries(standardGroups)
                .map(([k, v]) => `- ${k} → ${v.join(' | ')}`)
                .join('\n');

            dataSections += `
💰 GIÁ THEO HẠNG GHẾ:
${priceSummaryList}

💰 BẢNG GIÁ CHI TIẾT:
${priceStandardList}

QUY TẮC TRẢ LỜI GIÁ:
1. Nếu hỏi CHUNG → trả lời RANGE + hỏi lại phòng/giờ cụ thể.
2. Nếu hỏi CỤ THỂ → trả lời CHÍNH XÁC 1 con số.
3. Luôn nêu rõ: hạng ghế + loại phòng + khung giờ + ngày.
`;
        }

        /* === INTENT: SHOWTIME === */
        if (intent === 'showtime') {
            const showtimeByMovie = {};
            showtimes.forEach(s => {
                if (!showtimeByMovie[s.movie_id]) {
                    showtimeByMovie[s.movie_id] = { title: s.movie_title, slots: [] };
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

            dataSections += `
🎬 SUẤT CHIẾU 7 NGÀY TỚI:
${showtimeList}
`;
        }

        /* === INTENT: CINEMA === */
        if (intent === 'cinema') {
            const cinemaList = cinemas.map(c =>
                `- ${c.cinema_name}: ${c.address} | Hotline: ${c.hotline}`
            ).join('\n');

            dataSections += `
🏢 HỆ THỐNG RẠP:
${cinemaList}
`;
        }

        /* === INTENT: PROMOTION === */
        if (intent === 'promotion') {
            const promoList = promotions.map(p => {
                const desc = (p.description || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim()
                    .slice(0, 100);
                return `- ${p.title}: ${desc}`;
            }).join('\n') || 'Hiện chưa có khuyến mãi.';

            const productList = products.map(p =>
                `- ${p.product_name} (${p.category}): ${Number(p.price).toLocaleString('vi-VN')}đ`
            ).join('\n');

            dataSections += `
🎁 KHUYẾN MÃI:
${promoList}

🍿 COMBO:
${productList}
`;
        }

        /* === INTENT: MOVIE (không cần thêm gì, đã có list) === */
        /* === INTENT: GENERAL (include hết để AI có context) === */
        if (intent === 'general') {
            const showtimeByMovie = {};
            showtimes.forEach(s => {
                if (!showtimeByMovie[s.movie_id]) {
                    showtimeByMovie[s.movie_id] = { title: s.movie_title, slots: [] };
                }
                showtimeByMovie[s.movie_id].slots.push(
                    `${s.start_time} | ${s.cinema_name} | ${s.room_name}`
                );
            });

            const showtimeList = Object.entries(showtimeByMovie)
                .map(([movieId, data]) =>
                    `📽️ ${data.title}:\n   ${data.slots.slice(0, 5).join('\n   ')}`
                )
                .join('\n\n');

            const cinemaList = cinemas.map(c =>
                `- ${c.cinema_name}: ${c.address} | Hotline: ${c.hotline}`
            ).join('\n');

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

            dataSections += `
🎬 SUẤT CHIẾU:
${showtimeList}

🏢 RẠP:
${cinemaList}

💰 TÓM TẮT GIÁ:
${priceSummaryList}
`;
        }

        /* ---------- Footer: examples + JSON format ---------- */
        const footer = `
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

User: "Rạp ở đâu?"
Bot: "Quang Dũng Cinema có các chi nhánh:
- Quang Dũng Cinema Quận 1: 123 Nguyễn Huệ, Q.1
- Quang Dũng Cinema Tân Bình: 456 Cách Mạng Tháng 8, Tân Bình
Bạn muốn đến chi nhánh nào?"

User: "Rạp có phòng 4DMAX không?"
Bot: "Rạp hiện có 4 loại phòng: 2D, 3D, VIP và IMAX. Chưa có phòng 4DMAX bạn nhé."

User: "Xin chào"
Bot: "Chào bạn! Mình là trợ lý AI của Quang Dũng Cinema. Bạn muốn xem phim gì hôm nay?"

═══════════════════════════════════════════

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "reply": "câu trả lời tiếng Việt",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim cụ thể, để movie_ids = [].
`;

        return header + '\n' + dataSections + '\n' + footer;
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

        /* ---------- Detect intent ---------- */
        const intent = this.detectIntent(message);
        console.log(`🎯 [AI] Intent: ${intent} | Message: "${message.slice(0, 50)}"`);

        /* ---------- Build dynamic prompt ---------- */
        const systemPrompt = this.buildSystemPrompt(context, intent);

        console.log(`📏 [AI] Prompt length: ${systemPrompt.length} chars`);

        /* ---------- Call Groq ---------- */
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-10),
                { role: 'user', content: message }
            ],
            model: MODEL,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            response_format: { type: 'json_object' }
        });

        /* ---------- Parse JSON an toàn ---------- */
        let aiResponse;

        try {
            const raw = chatCompletion.choices[0].message.content;
            aiResponse = JSON.parse(raw);
        } catch (err) {
            console.warn('[AI Service] Parse JSON failed:', err?.message);

            aiResponse = {
                reply: chatCompletion.choices[0].message.content || 'Xin lỗi, mình chưa hiểu câu hỏi.',
                movie_ids: []
            };
        }

        /* ---------- Validate movie_ids ---------- */
        const rawIds = Array.isArray(aiResponse.movie_ids)
            ? aiResponse.movie_ids
            : [];

        const validIds = rawIds
            .map(Number)
            .filter(id => Number.isInteger(id) && id > 0)
            .filter(id => context.movies.some(m => m.movie_id === id));

        /* ---------- Map suggested movies ---------- */
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
            reply: aiResponse.reply || 'Xin lỗi, mình chưa có câu trả lời.',
            movies: suggestedMovies
        };
    }
}

module.exports = new AiService();
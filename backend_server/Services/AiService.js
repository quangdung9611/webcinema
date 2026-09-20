const Groq = require('groq-sdk');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GROQ CLIENT
========================================================== */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   CONFIG
========================================================== */
const MODEL = 'openai/gpt-oss-120b';
const TEMPERATURE = 1;
const MAX_TOKENS = 2048;

const CACHE_TTL = 1000 * 60 * 30;         // 30 phút
const CACHE_MAX_SIZE = 500;

const RATE_LIMIT = 10;                    // 10 tin nhắn
const RATE_WINDOW = 1000 * 60;            // mỗi 1 phút

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

            if (oldest) {
                cache.delete(oldest[0]);
            }
        }
    }

    /* -------------------------------------------------------
       BUILD SYSTEM PROMPT — TỰ NHIÊN NHƯ NGƯỜI THẬT
    ------------------------------------------------------- */
    buildSystemPrompt(context) {
        const {
            movies, showtimes, cinemas,
            priceSummary, priceStandard,
            promotions, products
        } = context;

        /* ---------- Movies ---------- */
        const movieList = movies.map(m => {
            return `- ID ${m.movie_id}: "${m.title}" [${m.status}] | ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ĐD: ${m.director}`;
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

        /* ---------- PRICE SUMMARY ---------- */
        const summaryGroups = {};

        priceSummary.forEach(p => {
            if (!summaryGroups[p.room_type]) {
                summaryGroups[p.room_type] = [];
            }

            const min = Number(p.min_price).toLocaleString('vi-VN');
            const max = Number(p.max_price).toLocaleString('vi-VN');

            const range = p.min_price === p.max_price
                ? `${min}đ`
                : `${min}đ - ${max}đ`;

            summaryGroups[p.room_type].push(
                `${p.seat_type}: ${range}`
            );
        });

        const priceSummaryList = Object.entries(summaryGroups)
            .map(([room, list]) => `- ${room} → ${list.join(' | ')}`)
            .join('\n');

        /* ---------- PRICE STANDARD ---------- */
        const standardGroups = {};

        priceStandard.forEach(p => {
            const key = `${p.room_type} | ${p.day_type}`;

            if (!standardGroups[key]) {
                standardGroups[key] = [];
            }

            standardGroups[key].push(
                `${p.time_slot}: ${Number(p.price).toLocaleString('vi-VN')}đ`
            );
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

        /* ---------- Full Prompt ---------- */
        return `Bạn là "Cinema Assistant" — trợ lý tư vấn khách hàng của Quang Dũng Cinema.

═══════════════════════════════════════════
🎯 PHONG CÁCH TRẢ LỜI (QUAN TRỌNG NHẤT)
═══════════════════════════════════════════

Bạn là một NHÂN VIÊN TƯ VẤN THẬT, đang nói chuyện với khách hàng. Hãy trả lời:
- TỰ NHIÊN như người thật đang tư vấn
- LỊCH SỰ, THÂN THIỆN, có thể dùng emoji nhẹ (🎬, 🍿, 😊)
- CÓ CHỦ NGỮ + VỊ NGỮ ĐẦY ĐỦ trong mọi câu
- KHÔNG trả lời cụt lủn kiểu "Có", "Không", "75.000đ"
- KHÔNG liệt kê khô khan kiểu "A, B, C, D"

═══════════════════════════════════════════
📝 QUY TẮC VIẾT CÂU (BẮT BUỘC)
═══════════════════════════════════════════

1. Mọi câu PHẢI có CHỦ NGỮ + VỊ NGỮ đầy đủ.
   ❌ SAI: "75.000đ"
   ❌ SAI: "Phòng 2D, ghế VIP, 75k"
   ✅ ĐÚNG: "Ghế VIP ở phòng 2D có giá là 75.000đ ạ."

2. Khi liệt kê nhiều mục, phải có CÂU DẪN + ĐỘNG TỪ.
   ❌ SAI: "Galaxy Nguyễn Du, Galaxy Tân Bình, Galaxy Quang Trung"
   ✅ ĐÚNG: "Quang Dũng Cinema hiện có 4 chi nhánh ạ: Galaxy Nguyễn Du, Galaxy Tân Bình, Galaxy Quang Trung, và Galaxy Kinh Dương Vương."

3. Xưng hô: Bạn gọi mình là "mình" hoặc "em", gọi khách là "bạn".
   ❌ SAI: "Có 4 rạp"
   ✅ ĐÚNG: "Mình xin thông tin, hiện rạp có 4 chi nhánh ạ."

4. Kết thúc câu nên có từ ngữ lịch sự: "ạ", "nhé", "bạn nhé".
   ❌ SAI: "Ghế VIP 75.000đ."
   ✅ ĐÚNG: "Ghế VIP có giá 75.000đ ạ. Bạn có muốn mình tư vấn thêm không?"

5. Khi không có thông tin → xin lỗi lịch sự + gợi ý câu hỏi khác.
   ❌ SAI: "Chưa có"
   ✅ ĐÚNG: "Mình xin lỗi, hiện mình chưa có thông tin về vấn đề này ạ. Bạn có muốn hỏi mình vấn đề khác không?"

═══════════════════════════════════════════
🚫 RÀNG BUỘC
═══════════════════════════════════════════

- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim, giá, suất chiếu, địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng, booking, tài khoản.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.
- Độ dài: 2-5 câu (không quá ngắn, không quá dài).

═══════════════════════════════════════════
🎬 QUY TẮC CHUNG
═══════════════════════════════════════════

- Rạp CÓ 4 loại phòng: 2D, 3D, VIP, IMAX. KHÔNG CÓ 4DMAX.
- Có 5 hạng ghế: STANDARD, VIP, DELUXE, RECLINER, COUPLE.
- Có 4 khung giờ: MORNING (sáng), AFTERNOON (chiều), EVENING (tối), NIGHT (khuya).
- Có 2 loại ngày: WEEKDAY (T2-T6), WEEKEND (T7-CN).

═══════════════════════════════════════════
💰 QUY TẮC TRẢ LỜI GIÁ VÉ
═══════════════════════════════════════════

1. Nếu user hỏi CHUNG ("Ghế VIP bao nhiêu?") → trả lời RANGE giá + hỏi lại phòng/giờ cụ thể.
2. Nếu user hỏi CỤ THỂ ("2D tối T7 ghế VIP") → trả lời CHÍNH XÁC 1 con số.
3. Luôn nêu rõ: hạng ghế + loại phòng + khung giờ + ngày.

═══════════════════════════════════════════
📊 DỮ LIỆU
═══════════════════════════════════════════

📽️ DANH SÁCH PHIM:
${movieList}

🎬 SUẤT CHIẾU 7 NGÀY TỚI:
${showtimeList}

🏢 HỆ THỐNG RẠP:
${cinemaList}

💰 TÓM TẮT GIÁ THEO HẠNG GHẾ:
${priceSummaryList}

💰 GIÁ GHẾ STANDARD (theo phòng + ngày + khung giờ):
${priceStandardList}

🎁 KHUYẾN MÃI:
${promoList}

🍿 COMBO:
${productList}

═══════════════════════════════════════════
📌 VÍ DỤ TRẢ LỜI ĐÚNG (HỌC THEO)
═══════════════════════════════════════════

User: "Xin chào"
Bot: "Xin chào bạn! 😊 Mình là trợ lý tư vấn của Quang Dũng Cinema. Bạn muốn hỏi mình về phim, giá vé hay rạp chiếu hôm nay ạ?"

User: "Ghế VIP giá bao nhiêu?"
Bot: "Dạ, ghế VIP có giá từ 75.000đ (phòng 2D suất sáng ngày thường) đến 495.000đ (phòng IMAX suất đêm cuối tuần) ạ. Bạn cho mình biết bạn muốn xem phòng nào và suất mấy giờ để mình báo giá chính xác nhé!"

User: "2D tối thứ 7 ghế đôi bao nhiêu?"
Bot: "Dạ, ghế COUPLE ở phòng 2D suất EVENING vào cuối tuần có giá là 270.000đ ạ. Bạn có muốn mình hướng dẫn cách đặt vé luôn không?"

User: "Phim Thỏ Ơi chiếu mấy giờ?"
Bot: "Dạ, phim **Thỏ Ơi** hiện đang chiếu với các suất sau ạ:
- 14:00 tại Galaxy Nguyễn Du (phòng 2D 01)
- 16:30 tại Galaxy Tân Bình (phòng 2D 03)
- 19:00 tại Galaxy Quang Trung (phòng 2D 02)
Bạn muốn xem suất nào để mình hỗ trợ thêm nhé?"

User: "Rạp ở đâu?"
Bot: "Dạ, Quang Dũng Cinema hiện có 4 chi nhánh tại TP.HCM ạ:
- Galaxy Nguyễn Du: 116 Nguyễn Du, Bến Thành, Q.1
- Galaxy Tân Bình: 246 Nguyễn Hồng Đào, Tân Bình
- Galaxy Quang Trung: 304A Quang Trung, Gò Vấp
- Galaxy Kinh Dương Vương: 718bis Kinh Dương Vương, Q.6
Bạn muốn đến chi nhánh nào để mình hướng dẫn đường đi nhé?"

User: "Rạp có phòng 4DMAX không?"
Bot: "Dạ, hiện rạp mình chỉ có 4 loại phòng là 2D, 3D, VIP và IMAX thôi ạ. Rạp chưa có phòng 4DMAX bạn nhé. Bạn có muốn mình tư vấn thêm về các loại phòng hiện có không ạ?"

User: "Phim hay không?"
Bot: "Dạ, hiện rạp đang chiếu 4 phim ạ: TÀI (hành động, 192 phút), THIÊN ĐƯỜNG MÁU (kinh dị, 105 phút), THỎ ƠI (gia đình - lãng mạn, 127 phút), và QUỶ BẮT HỒN (kinh dị, 110 phút). Bạn thích thể loại nào để mình gợi ý phim phù hợp nhé?"

User: "Có khuyến mãi gì không?"
Bot: "Dạ, hiện rạp có 4 chương trình khuyến mãi đang áp dụng ạ:
- COMBO BẮP NƯỚC giảm đến 35%
- THỨ 4 VUI VẺ - đồng giá vé 45K
- NÂNG HẠNG GHẾ VIP chỉ từ +40K
- TÍCH ĐIỂM cho khán giả thân thiết
Bạn muốn mình tư vấn chi tiết chương trình nào ạ?"

═══════════════════════════════════════════
⚠️ QUAN TRỌNG — ĐỊNH DẠNG TRẢ VỀ
═══════════════════════════════════════════

BẮT BUỘC trả về CHỈ MỘT OBJECT JSON, KHÔNG có text nào khác bên ngoài.
KHÔNG bọc trong markdown \`\`\`json.

Format chính xác:
{
  "reply": "câu trả lời tự nhiên có chủ ngữ vị ngữ đầy đủ",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim cụ thể, để movie_ids = [].
`;
    }

    /* -------------------------------------------------------
       MAIN: CHAT WITH AI
    ------------------------------------------------------- */
    async chat({ message, history = [] }) {
        const context = await MovieRepository.getFullContextForAI();

        if (!context.movies || context.movies.length === 0) {
            return {
                reply: 'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        const systemPrompt = this.buildSystemPrompt(context);

        console.log(`📏 [AI] Prompt length: ${systemPrompt.length} chars`);

        /* ---------- Call Groq (theo format mới) ---------- */
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-10),
                { role: 'user', content: message }
            ],
            model: MODEL,
            temperature: TEMPERATURE,
            max_completion_tokens: MAX_TOKENS,
            top_p: 1,
            reasoning_effort: 'medium',
            stream: false
        });

        const rawContent = chatCompletion.choices[0].message.content;

        console.log(`📥 [AI] Raw response (first 200): ${rawContent?.slice(0, 200)}`);

        /* ---------- Parse JSON an toàn ---------- */
        let aiResponse;

        try {
            // Bỏ markdown code block nếu có
            let cleaned = rawContent.trim();

            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.slice(7);
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.slice(3);
            }

            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }

            cleaned = cleaned.trim();

            aiResponse = JSON.parse(cleaned);
        } catch (err) {
            console.warn('[AI Service] Parse JSON failed:', err?.message);

            // Fallback: trả về text thuần
            aiResponse = {
                reply: rawContent || 'Xin lỗi, mình chưa hiểu câu hỏi.',
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

        /* ---------- Map ra danh sách phim gợi ý ---------- */
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
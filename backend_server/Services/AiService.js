const { GoogleGenerativeAI } = require('@google/generative-ai');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GEMINI CLIENT
========================================================== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================================================
   CONFIG
========================================================== */
const MODEL_NAME = 'gemini-3.6-flash';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 2048;

const CACHE_TTL = 1000 * 60 * 60 * 4;      // 4 giờ
const CACHE_MAX_SIZE = 500;

const RATE_LIMIT = 10;                      // 10 tin/phút
const RATE_WINDOW = 1000 * 60;

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
       DETECT INTENT
    ------------------------------------------------------- */
    detectIntent(message) {
        const lower = message.toLowerCase();

        if (/(giá|bao nhiêu|price|vé|tiền|đồng|vnd)/.test(lower)) {
            return 'price';
        }

        if (/(suất|giờ|mấy giờ|khi nào|chiếu lúc|showtime|time)/.test(lower)) {
            return 'showtime';
        }

        if (/(rạp|địa chỉ|ở đâu|hotline|đường|quận|thành phố|address)/.test(lower)) {
            return 'cinema';
        }

        if (/(khuyến mãi|giảm giá|ưu đãi|combo|bắp|nước|promo|voucher)/.test(lower)) {
            return 'promotion';
        }

        if (/(phim|đang chiếu|sắp chiếu|hay|gợi ý|đề xuất|thể loại|movie)/.test(lower)) {
            return 'movie';
        }

        return 'general';
    }

    /* -------------------------------------------------------
       BUILD SYSTEM PROMPT
    ------------------------------------------------------- */
    buildSystemPrompt(context, intent, userName = null) {
        const {
            movies, showtimes, cinemas,
            priceSummary, priceStandard,
            promotions, products
        } = context;

        /* ---------- Movies ---------- */
        const movieList = movies.map(m => {
            return `- ID ${m.movie_id}: "${m.title}" [${m.status}] | ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ĐD: ${m.director}`;
        }).join('\n');

        /* ---------- Showtimes ---------- */
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

        /* ---------- Thông tin user ---------- */
        const userInfo = userName
            ? `\n👤 KHÁCH HÀNG ĐANG CHAT: "${userName}"\n→ Thỉnh thoảng gọi tên khách trong câu trả lời (VD: "${userName} ơi", "Dạ ${userName}"). CHỈ gọi 1 lần trong 1 câu trả lời, đừng lạm dụng.\n`
            : '';

        /* ---------- Full Prompt ---------- */
        return `Bạn là "Cinema Assistant" — trợ lý tư vấn khách hàng của Quang Dũng Cinema.
${userInfo}
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
   ✅ ĐÚNG: "Ghế VIP ở phòng 2D có giá là 75.000đ ạ."

2. Khi liệt kê nhiều mục, phải có CÂU DẪN + ĐỘNG TỪ.
   ❌ SAI: "Galaxy Nguyễn Du, Galaxy Tân Bình"
   ✅ ĐÚNG: "Quang Dũng Cinema hiện có 4 chi nhánh ạ: Galaxy Nguyễn Du, Galaxy Tân Bình..."

3. Xưng hô: Bạn gọi mình là "mình" hoặc "em", gọi khách là "bạn" hoặc tên riêng.

4. Kết thúc câu nên có từ ngữ lịch sự: "ạ", "nhé", "bạn nhé".

5. Khi không có thông tin → xin lỗi lịch sự + gợi ý câu hỏi khác.

═══════════════════════════════════════════
🚫 RÀNG BUỘC
═══════════════════════════════════════════

- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim, giá, suất chiếu, địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng, booking, tài khoản.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.
- Độ dài: 2-5 câu.

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

1. Nếu user hỏi CHUNG → trả lời RANGE giá + hỏi lại phòng/giờ cụ thể.
2. Nếu user hỏi CỤ THỂ → trả lời CHÍNH XÁC 1 con số.
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
📌 VÍ DỤ TRẢ LỜI ĐÚNG
═══════════════════════════════════════════

User: "Xin chào"
Bot: "Xin chào bạn! 😊 Mình là trợ lý tư vấn của Quang Dũng Cinema. Bạn muốn hỏi mình về phim, giá vé hay rạp chiếu hôm nay ạ?"

User: "Ghế VIP giá bao nhiêu?"
Bot: "Dạ, ghế VIP có giá từ 75.000đ (phòng 2D suất sáng ngày thường) đến 495.000đ (phòng IMAX suất đêm cuối tuần) ạ. Bạn cho mình biết bạn muốn xem phòng nào và suất mấy giờ để mình báo giá chính xác nhé!"

User: "2D tối thứ 7 ghế đôi bao nhiêu?"
Bot: "Dạ, ghế COUPLE ở phòng 2D suất EVENING vào cuối tuần có giá là 270.000đ ạ. Bạn có muốn mình hướng dẫn cách đặt vé luôn không?"

User: "Rạp ở đâu?"
Bot: "Dạ, Quang Dũng Cinema hiện có 4 chi nhánh tại TP.HCM ạ:
- Galaxy Nguyễn Du: 116 Nguyễn Du, Bến Thành, Q.1
- Galaxy Tân Bình: 246 Nguyễn Hồng Đào, Tân Bình
- Galaxy Quang Trung: 304A Quang Trung, Gò Vấp
- Galaxy Kinh Dương Vương: 718bis Kinh Dương Vương, Q.6
Bạn muốn đến chi nhánh nào để mình hướng dẫn đường đi nhé?"

User: "Có khuyến mãi gì không?"
Bot: "Dạ, hiện rạp có 4 chương trình khuyến mãi đang áp dụng ạ: COMBO BẮP NƯỚC giảm 35%, THỨ 4 VUI VẺ giá 45K, NÂNG HẠNG GHẾ VIP chỉ từ +40K, và TÍCH ĐIỂM cho khán giả thân thiết. Bạn muốn mình tư vấn chi tiết chương trình nào ạ?"

═══════════════════════════════════════════
⚠️ ĐỊNH DẠNG TRẢ VỀ (BẮT BUỘC)
═══════════════════════════════════════════

BẮT BUỘC trả về CHỈ MỘT OBJECT JSON, KHÔNG có text nào khác.
Format:
{
  "reply": "câu trả lời tự nhiên",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim, để movie_ids = [].`;
    }

    /* -------------------------------------------------------
       MAIN: CHAT WITH GEMINI
    ------------------------------------------------------- */
    async chat({ message, history = [], userName = null }) {
        const context = await MovieRepository.getFullContextForAI();

        if (!context.movies || context.movies.length === 0) {
            return {
                reply: 'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        const intent = this.detectIntent(message);
        console.log(`🎯 [AI] Intent: ${intent} | User: ${userName || 'guest'} | Message: "${message.slice(0, 50)}"`);

        const systemPrompt = this.buildSystemPrompt(context, intent, userName);
        console.log(`📏 [AI] Prompt length: ${systemPrompt.length} chars`);

        /* ---------- Khởi tạo model ---------- */
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: TEMPERATURE,
                maxOutputTokens: MAX_TOKENS,
                responseMimeType: 'application/json'
            }
        });

        /* ---------- Build history ---------- */
        let geminiHistory = history
            .slice(-10)
            .map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            }));

        /* ✅ QUAN TRỌNG: Gemini yêu cầu tin đầu tiên phải là 'user' */
        while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
            geminiHistory.shift();
        }

        /* ---------- Bắt đầu chat session ---------- */
        const chat = model.startChat({
            history: geminiHistory
        });

        /* ---------- Gửi tin nhắn ---------- */
        const result = await chat.sendMessage(message);
        const rawContent = result.response.text();

        console.log(`📥 [AI] Raw response (first 200): ${rawContent?.slice(0, 200)}`);

        /* ---------- Parse JSON ---------- */
        let aiResponse;

        try {
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
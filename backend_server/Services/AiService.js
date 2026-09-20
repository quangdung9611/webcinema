// ============================================================
// SERVICES / AiService.js
// QUANG DŨNG CINEMA — AI CINEMA ASSISTANT
//
// SDK:
// @google/genai
//
// Giữ nguyên:
// - Cache
// - Rate limit
// - Detect intent
// - MovieRepository context
// - System prompt
// - History
// - Movie suggestions
// - JSON response
//
// Thay đổi:
// - GoogleGenerativeAI  → GoogleGenAI
// - @google/generative-ai → @google/genai
// ============================================================

const { GoogleGenAI } = require('@google/genai');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GEMINI CLIENT
========================================================== */

// SDK mới @google/genai
//
// SDK sẽ lấy GEMINI_API_KEY từ environment.
// Truyền explicit để chắc chắn production dùng đúng biến môi trường.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error(
        '❌ [Gemini] GEMINI_API_KEY chưa được load từ environment.'
    );
}

const genAI = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
});

/* =========================================================
   CONFIG
========================================================== */

const MODEL_NAME = 'gemini-3.6-flash';

const TEMPERATURE = 0.7;
const MAX_TOKENS = 2048;

const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 giờ
const CACHE_MAX_SIZE = 500;

const RATE_LIMIT = 10; // 10 tin/phút
const RATE_WINDOW = 1000 * 60;

/* =========================================================
   CACHE + RATE LIMIT
========================================================== */

const cache = new Map();
const rateLimit = new Map();

/* =========================================================
   AUTO CLEANUP CACHE
   Mỗi 10 phút
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
        console.log(
            `🧹 [AI Cache] Cleaned ${cleaned} expired entries`
        );
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
                retryAfter: Math.ceil(
                    (rl.resetAt - now) / 1000
                )
            };
        }

        rl.count++;

        rateLimit.set(ip, rl);

        return {
            allowed: true
        };
    }

    /* -------------------------------------------------------
       GET FROM CACHE
    ------------------------------------------------------- */

    getCache(key) {
        const cached = cache.get(key);

        if (!cached) {
            return null;
        }

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
        cache.set(key, {
            ...value,
            ts: Date.now()
        });

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

        if (
            /(giá|bao nhiêu|price|vé|tiền|đồng|vnd)/.test(lower)
        ) {
            return 'price';
        }

        if (
            /(suất|giờ|mấy giờ|khi nào|chiếu lúc|showtime|time)/.test(
                lower
            )
        ) {
            return 'showtime';
        }

        if (
            /(rạp|địa chỉ|ở đâu|hotline|đường|quận|thành phố|address)/.test(
                lower
            )
        ) {
            return 'cinema';
        }

        if (
            /(khuyến mãi|giảm giá|ưu đãi|combo|bắp|nước|promo|voucher)/.test(
                lower
            )
        ) {
            return 'promotion';
        }

        if (
            /(phim|đang chiếu|sắp chiếu|hay|gợi ý|đề xuất|thể loại|movie)/.test(
                lower
            )
        ) {
            return 'movie';
        }

        return 'general';
    }

    /* -------------------------------------------------------
       BUILD SYSTEM PROMPT
    ------------------------------------------------------- */

    buildSystemPrompt(context, intent, userName = null) {
        const {
            movies = [],
            showtimes = [],
            cinemas = [],
            priceSummary = [],
            priceStandard = [],
            promotions = [],
            products = []
        } = context;

        /* =====================================================
           MOVIES
        ====================================================== */

        const movieList = movies
            .map((m) => {
                return `- ID ${m.movie_id}: "${m.title}" [${m.status}] | ${m.genres || 'N/A'} | ${m.duration}p | T${m.age_rating} | ĐD: ${m.director}`;
            })
            .join('\n');

        /* =====================================================
           SHOWTIMES
        ====================================================== */

        const showtimeByMovie = {};

        showtimes.forEach((s) => {
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
            .map(([movieId, data]) => {
                return (
                    `📽️ ${data.title} (ID ${movieId}):\n` +
                    `   ${data.slots.slice(0, 8).join('\n   ')}`
                );
            })
            .join('\n\n') ||
            'Chưa có suất chiếu nào trong 7 ngày tới.';

        /* =====================================================
           CINEMAS
        ====================================================== */

        const cinemaList = cinemas
            .map((c) => {
                return `- ${c.cinema_name}: ${c.address} | Hotline: ${c.hotline}`;
            })
            .join('\n');

        /* =====================================================
           PRICE SUMMARY
        ====================================================== */

        const summaryGroups = {};

        priceSummary.forEach((p) => {
            if (!summaryGroups[p.room_type]) {
                summaryGroups[p.room_type] = [];
            }

            const min = Number(p.min_price).toLocaleString('vi-VN');
            const max = Number(p.max_price).toLocaleString('vi-VN');

            const range =
                p.min_price === p.max_price
                    ? `${min}đ`
                    : `${min}đ - ${max}đ`;

            summaryGroups[p.room_type].push(
                `${p.seat_type}: ${range}`
            );
        });

        const priceSummaryList = Object.entries(summaryGroups)
            .map(([room, list]) => {
                return `- ${room} → ${list.join(' | ')}`;
            })
            .join('\n');

        /* =====================================================
           PRICE STANDARD
        ====================================================== */

        const standardGroups = {};

        priceStandard.forEach((p) => {
            const key = `${p.room_type} | ${p.day_type}`;

            if (!standardGroups[key]) {
                standardGroups[key] = [];
            }

            standardGroups[key].push(
                `${p.time_slot}: ${Number(p.price).toLocaleString('vi-VN')}đ`
            );
        });

        const priceStandardList = Object.entries(standardGroups)
            .map(([key, values]) => {
                return `- ${key} → ${values.join(' | ')}`;
            })
            .join('\n');

        /* =====================================================
           PROMOTIONS
        ====================================================== */

        const promoList =
            promotions
                .map((p) => {
                    const desc = (p.description || '')
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .trim()
                        .slice(0, 80);

                    return `- ${p.title}: ${desc}`;
                })
                .join('\n') ||
            'Hiện chưa có khuyến mãi.';

        /* =====================================================
           PRODUCTS / COMBO
        ====================================================== */

        const productList = products
            .map((p) => {
                return `- ${p.product_name} (${p.category}): ${Number(
                    p.price
                ).toLocaleString('vi-VN')}đ`;
            })
            .join('\n');

        /* =====================================================
           USER INFO
        ====================================================== */

        const userInfo = userName
            ? `
👤 KHÁCH HÀNG ĐANG CHAT: "${userName}"

→ Thỉnh thoảng gọi tên khách trong câu trả lời.
Ví dụ:
- "${userName} ơi"
- "Dạ ${userName}"

CHỈ gọi tên 1 lần trong 1 câu trả lời.
Không lạm dụng.
`
            : '';

        /* =====================================================
           FULL SYSTEM PROMPT
        ====================================================== */

        return `Bạn là "Cinema Assistant" — trợ lý tư vấn khách hàng của Quang Dũng Cinema.
${userInfo}
═══════════════════════════════════════════
🎯 PHONG CÁCH TRẢ LỜI (QUAN TRỌNG NHẤT)
═══════════════════════════════════════════

Bạn là một NHÂN VIÊN TƯ VẤN THẬT, đang nói chuyện với khách hàng.

Hãy trả lời:
- TỰ NHIÊN như người thật đang tư vấn
- LỊCH SỰ, THÂN THIỆN
- Có thể dùng emoji nhẹ như 🎬 🍿 😊
- CÓ CHỦ NGỮ + VỊ NGỮ ĐẦY ĐỦ trong mọi câu
- KHÔNG trả lời cụt lủn kiểu "Có", "Không", "75.000đ"
- KHÔNG liệt kê khô khan kiểu "A, B, C, D"

═══════════════════════════════════════════
📝 QUY TẮC VIẾT CÂU (BẮT BUỘC)
═══════════════════════════════════════════

1. Mọi câu PHẢI có CHỦ NGỮ + VỊ NGỮ đầy đủ.

❌ SAI:
"75.000đ"

✅ ĐÚNG:
"Ghế VIP ở phòng 2D có giá là 75.000đ ạ."

2. Khi liệt kê nhiều mục, phải có CÂU DẪN + ĐỘNG TỪ.

❌ SAI:
"Galaxy Nguyễn Du, Galaxy Tân Bình"

✅ ĐÚNG:
"Quang Dũng Cinema hiện có 4 chi nhánh ạ: Galaxy Nguyễn Du, Galaxy Tân Bình..."

3. Xưng hô:
- Bạn gọi mình là "mình" hoặc "em"
- Gọi khách là "bạn" hoặc tên riêng

4. Kết thúc câu nên có:
- "ạ"
- "nhé"
- "bạn nhé"

5. Khi không có thông tin:
- Xin lỗi lịch sự
- Gợi ý câu hỏi khác

═══════════════════════════════════════════
🚫 RÀNG BUỘC
═══════════════════════════════════════════

- CHỈ dùng thông tin trong DỮ LIỆU bên dưới.
- KHÔNG bịa tên phim.
- KHÔNG bịa giá.
- KHÔNG bịa suất chiếu.
- KHÔNG bịa địa chỉ.
- KHÔNG tiết lộ thông tin khách hàng.
- KHÔNG tiết lộ booking.
- KHÔNG tiết lộ tài khoản.
- Nếu user hỏi ngoài chủ đề rạp phim → từ chối lịch sự.
- Độ dài: 2-5 câu.

═══════════════════════════════════════════
🎬 QUY TẮC CHUNG
═══════════════════════════════════════════

- Rạp CÓ 4 loại phòng:
  2D, 3D, VIP, IMAX.

- KHÔNG CÓ 4DMAX.

- Có 5 hạng ghế:
  STANDARD, VIP, DELUXE, RECLINER, COUPLE.

- Có 4 khung giờ:
  MORNING (sáng),
  AFTERNOON (chiều),
  EVENING (tối),
  NIGHT (khuya).

- Có 2 loại ngày:
  WEEKDAY (T2-T6),
  WEEKEND (T7-CN).

═══════════════════════════════════════════
💰 QUY TẮC TRẢ LỜI GIÁ VÉ
═══════════════════════════════════════════

1. Nếu user hỏi CHUNG:
→ Trả lời RANGE giá
→ Hỏi lại phòng/giờ cụ thể.

2. Nếu user hỏi CỤ THỂ:
→ Trả lời CHÍNH XÁC 1 con số.

3. Luôn nêu rõ:
- Hạng ghế
- Loại phòng
- Khung giờ
- Ngày

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

Bot:
"Xin chào bạn! 😊 Mình là trợ lý tư vấn của Quang Dũng Cinema. Bạn muốn hỏi mình về phim, giá vé hay rạp chiếu hôm nay ạ?"

User: "Ghế VIP giá bao nhiêu?"

Bot:
"Dạ, ghế VIP có giá từ 75.000đ (phòng 2D suất sáng ngày thường) đến 495.000đ (phòng IMAX suất đêm cuối tuần) ạ. Bạn cho mình biết bạn muốn xem phòng nào và suất mấy giờ để mình báo giá chính xác nhé!"

User: "2D tối thứ 7 ghế đôi bao nhiêu?"

Bot:
"Dạ, ghế COUPLE ở phòng 2D suất EVENING vào cuối tuần có giá là 270.000đ ạ. Bạn có muốn mình hướng dẫn cách đặt vé luôn không?"

User: "Rạp ở đâu?"

Bot:
"Dạ, Quang Dũng Cinema hiện có 4 chi nhánh tại TP.HCM ạ:
- Galaxy Nguyễn Du: 116 Nguyễn Du, Bến Thành, Q.1
- Galaxy Tân Bình: 246 Nguyễn Hồng Đào, Tân Bình
- Galaxy Quang Trung: 304A Quang Trung, Gò Vấp
- Galaxy Kinh Dương Vương: 718bis Kinh Dương Vương, Q.6

Bạn muốn đến chi nhánh nào để mình hướng dẫn đường đi nhé?"

User: "Có khuyến mãi gì không?"

Bot:
"Dạ, hiện rạp có 4 chương trình khuyến mãi đang áp dụng ạ: COMBO BẮP NƯỚC giảm 35%, THỨ 4 VUI VẺ giá 45K, NÂNG HẠNG GHẾ VIP chỉ từ +40K, và TÍCH ĐIỂM cho khán giả thân thiết. Bạn muốn mình tư vấn chi tiết chương trình nào ạ?"

═══════════════════════════════════════════
⚠️ ĐỊNH DẠNG TRẢ VỀ (BẮT BUỘC)
═══════════════════════════════════════════

BẮT BUỘC trả về CHỈ MỘT OBJECT JSON.

KHÔNG có:
- Markdown
- \`\`\`json
- Text bên ngoài JSON
- Giải thích bên ngoài JSON

Format:

{
  "reply": "câu trả lời tự nhiên",
  "movie_ids": [1, 2]
}

Nếu không gợi ý phim:

{
  "reply": "câu trả lời tự nhiên",
  "movie_ids": []
}`;
    }

    /* -------------------------------------------------------
       NORMALIZE GEMINI ERROR
    ------------------------------------------------------- */

    normalizeGeminiError(error) {
        const status =
            error?.status ??
            error?.statusCode ??
            error?.code ??
            error?.error?.status ??
            error?.error?.code ??
            null;

        const message =
            error?.message ||
            error?.error?.message ||
            'Unknown Gemini API error';

        console.error(
            '❌ [Gemini API Error]',
            JSON.stringify(
                {
                    status,
                    code: error?.code ?? null,
                    message
                },
                null,
                2
            )
        );

        // Không bao giờ log API key.
        const normalizedError = new Error(message);

        normalizedError.status = Number.isFinite(Number(status))
            ? Number(status)
            : status;

        normalizedError.code = error?.code;
        normalizedError.originalError = error;

        return normalizedError;
    }

    /* -------------------------------------------------------
       CLEAN JSON RESPONSE
    ------------------------------------------------------- */

    parseAIResponse(rawContent) {
        if (!rawContent) {
            return {
                reply: 'Xin lỗi, mình chưa nhận được câu trả lời từ hệ thống.',
                movie_ids: []
            };
        }

        try {
            let cleaned = String(rawContent).trim();

            // Xóa markdown fence nếu model vẫn trả về.
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.slice(7);
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.slice(3);
            }

            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }

            cleaned = cleaned.trim();

            const parsed = JSON.parse(cleaned);

            return {
                reply:
                    typeof parsed.reply === 'string'
                        ? parsed.reply.trim()
                        : 'Xin lỗi, mình chưa có câu trả lời phù hợp.',

                movie_ids:
                    Array.isArray(parsed.movie_ids)
                        ? parsed.movie_ids
                        : []
            };
        } catch (error) {
            console.warn(
                '⚠️ [AI Service] Parse JSON failed:',
                error?.message
            );

            // Fallback nếu model trả text thay vì JSON.
            return {
                reply:
                    String(rawContent).trim() ||
                    'Xin lỗi, mình chưa hiểu câu hỏi của bạn.',

                movie_ids: []
            };
        }
    }

    /* -------------------------------------------------------
       VALIDATE MOVIE IDS
    ------------------------------------------------------- */

    buildSuggestedMovies(movieIds, movies) {
        const validIds = Array.isArray(movieIds)
            ? movieIds
                .map(Number)
                .filter(
                    (id) =>
                        Number.isInteger(id) &&
                        id > 0
                )
                .filter((id) =>
                    movies.some(
                        (movie) =>
                            Number(movie.movie_id) === id
                    )
                )
            : [];

        return movies
            .filter((movie) =>
                validIds.includes(
                    Number(movie.movie_id)
                )
            )
            .slice(0, 3)
            .map((movie) => ({
                movie_id: movie.movie_id,
                title: movie.title,
                slug: movie.slug,
                movie_poster: movie.movie_poster,
                duration: movie.duration,
                age_rating: movie.age_rating,
                genres: movie.genres
                    ? movie.genres
                        .split(',')
                        .map((genre) => genre.trim())
                        .filter(Boolean)
                    : []
            }));
    }

    /* -------------------------------------------------------
       MAIN: CHAT WITH GEMINI
    ------------------------------------------------------- */

    async chat({
        message,
        history = [],
        userName = null
    }) {

        /* =====================================================
           CHECK API KEY
        ====================================================== */

        if (!GEMINI_API_KEY) {
            const error = new Error(
                'GEMINI_API_KEY chưa được cấu hình trong environment.'
            );

            error.status = 500;
            error.code = 'GEMINI_API_KEY_MISSING';

            throw error;
        }

        /* =====================================================
           LOAD CINEMA CONTEXT
        ====================================================== */

        const context =
            await MovieRepository.getFullContextForAI();

        if (
            !context ||
            !context.movies ||
            context.movies.length === 0
        ) {
            return {
                reply:
                    'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        /* =====================================================
           DETECT INTENT
        ====================================================== */

        const intent =
            this.detectIntent(message);

        console.log(
            `🎯 [AI] Intent: ${intent} | User: ${
                userName || 'guest'
            } | Message: "${String(message).slice(0, 50)}"`
        );

        /* =====================================================
           BUILD SYSTEM PROMPT
        ====================================================== */

        const systemPrompt =
            this.buildSystemPrompt(
                context,
                intent,
                userName
            );

        console.log(
            `📏 [AI] Prompt length: ${systemPrompt.length} chars`
        );

        /* =====================================================
           BUILD HISTORY
        ====================================================== */

        let geminiHistory = Array.isArray(history)
            ? history
                .slice(-10)
                .map((h) => ({
                    role:
                        h.role === 'user'
                            ? 'user'
                            : 'model',

                    parts: [
                        {
                            text: String(
                                h.content || ''
                            )
                        }
                    ]
                }))
                .filter(
                    (h) =>
                        h.parts[0].text.trim().length > 0
                )
            : [];

        /*
         * Gemini yêu cầu history hợp lệ.
         *
         * Tin đầu tiên phải là user.
         */
        while (
            geminiHistory.length > 0 &&
            geminiHistory[0].role === 'model'
        ) {
            geminiHistory.shift();
        }

        /*
         * Nếu history kết thúc bằng model thì vẫn OK
         * vì message mới sẽ là user.
         */

        /* =====================================================
           CREATE CHAT — SDK MỚI
        ====================================================== */

        const chat = genAI.chats.create({
            model: MODEL_NAME,

            history: geminiHistory,

            config: {
                systemInstruction: systemPrompt,

                temperature: TEMPERATURE,

                maxOutputTokens: MAX_TOKENS,

                responseMimeType: 'application/json'
            }
        });

        /* =====================================================
           SEND MESSAGE
        ====================================================== */

        let response;

        try {
            response = await chat.sendMessage({
                message
            });
        } catch (error) {
            const normalizedError =
                this.normalizeGeminiError(error);

            /*
             * 403:
             * API key không hợp lệ / không có quyền /
             * project hoặc credential có vấn đề.
             */
            if (
                normalizedError.status === 403
            ) {
                console.error(
                    '🚫 [Gemini] 403 PERMISSION_DENIED — kiểm tra GEMINI_API_KEY và quyền Gemini API.'
                );
            }

            /*
             * 429:
             * Rate limit / quota.
             */
            if (
                normalizedError.status === 429
            ) {
                console.warn(
                    '⏳ [Gemini] 429 RESOURCE_EXHAUSTED / RATE LIMIT'
                );
            }

            /*
             * 503:
             * Gemini service tạm thời unavailable.
             */
            if (
                normalizedError.status === 503
            ) {
                console.warn(
                    '⚠️ [Gemini] 503 SERVICE_UNAVAILABLE'
                );
            }

            throw normalizedError;
        }

        /* =====================================================
           GET RESPONSE TEXT
        ====================================================== */

        const rawContent =
            response?.text || '';

        console.log(
            `📥 [AI] Raw response (first 200): ${rawContent.slice(
                0,
                200
            )}`
        );

        /* =====================================================
           PARSE JSON
        ====================================================== */

        const aiResponse =
            this.parseAIResponse(
                rawContent
            );

        /* =====================================================
           BUILD SUGGESTED MOVIES
        ====================================================== */

        const suggestedMovies =
            this.buildSuggestedMovies(
                aiResponse.movie_ids,
                context.movies
            );

        /* =====================================================
           FINAL RESPONSE
        ====================================================== */

        return {
            reply:
                aiResponse.reply ||
                'Xin lỗi, mình chưa có câu trả lời.',

            movies: suggestedMovies
        };
    }
}

/* =========================================================
   EXPORT SINGLETON
========================================================== */

module.exports = new AiService();
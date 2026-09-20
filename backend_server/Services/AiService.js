// ============================================================
// SERVICES / AiService.js
// QUANG DŨNG CINEMA — AI CINEMA ASSISTANT v2
//
// MỤC TIÊU:
// - Phản hồi nhanh hơn
// - Giảm query DB
// - Giảm prompt processing
// - Giảm history gửi lên Gemini
// - Chống nhiều request cùng refresh context
// - Giữ nguyên movie suggestion
// - Giữ nguyên JSON response
// - Giữ nguyên rate limit + cache
//
// SDK:
// @google/genai
// ============================================================

const { GoogleGenAI } = require('@google/genai');
const MovieRepository = require('../Repositories/MovieRepository');

/* =========================================================
   GEMINI CLIENT
========================================================== */

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

// Giữ model hiện tại của bạn
const MODEL_NAME = 'gemini-3.6-flash';

// Temperature thấp hơn một chút vì chatbot chủ yếu trả lời
// dữ liệu thực tế của rạp, không cần quá sáng tạo.
const TEMPERATURE = 0.5;

// Chatbot chỉ trả 2-5 câu + JSON.
// 768 token là dư cho nhu cầu hiện tại.
const MAX_TOKENS = 768;

/* ---------------------------------------------------------
   CACHE — USER QUESTION
---------------------------------------------------------- */

const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 giờ
const CACHE_MAX_SIZE = 500;

/* ---------------------------------------------------------
   CACHE — CINEMA CONTEXT
---------------------------------------------------------- */

// Context gồm:
// - movies
// - showtimes
// - cinemas
// - prices
// - promotions
// - products
//
// Không cần query DB ở mỗi request.
const CONTEXT_CACHE_TTL = 1000 * 60 * 3; // 3 phút

/* ---------------------------------------------------------
   CACHE — SYSTEM PROMPT
---------------------------------------------------------- */

// Prompt được xây từ context.
// Cache riêng để không phải nối chuỗi khổng lồ mỗi request.
const PROMPT_CACHE_TTL = 1000 * 60 * 3;
const PROMPT_CACHE_MAX_SIZE = 100;

/* ---------------------------------------------------------
   RATE LIMIT
---------------------------------------------------------- */

const RATE_LIMIT = 10;
const RATE_WINDOW = 1000 * 60;

/* ---------------------------------------------------------
   HISTORY
---------------------------------------------------------- */

// Chỉ giữ context hội thoại gần nhất.
// 6 message = 3 lượt user/assistant.
const MAX_HISTORY = 6;

/* =========================================================
   MEMORY CACHES
========================================================== */

const cache = new Map();

const rateLimit = new Map();

const contextCache = {
    data: null,
    timestamp: 0,

    // Promise đang load context.
    // Dùng để chống nhiều request cùng query DB.
    loadingPromise: null
};

const promptCache = new Map();

/* =========================================================
   CACHE CLEANUP
   Mỗi 10 phút
========================================================== */

setInterval(() => {
    const now = Date.now();

    /* -------------------------------------------------------
       USER RESPONSE CACHE
    ------------------------------------------------------- */

    let cleanedResponseCache = 0;

    for (const [key, value] of cache.entries()) {
        if (
            now - value.ts >
            CACHE_TTL
        ) {
            cache.delete(key);
            cleanedResponseCache++;
        }
    }

    /* -------------------------------------------------------
       PROMPT CACHE
    ------------------------------------------------------- */

    let cleanedPromptCache = 0;

    for (const [key, value] of promptCache.entries()) {
        if (
            now - value.ts >
            PROMPT_CACHE_TTL
        ) {
            promptCache.delete(key);
            cleanedPromptCache++;
        }
    }

    /* -------------------------------------------------------
       RATE LIMIT CACHE
    ------------------------------------------------------- */

    let cleanedRateLimit = 0;

    for (const [ip, value] of rateLimit.entries()) {
        if (now > value.resetAt + RATE_WINDOW) {
            rateLimit.delete(ip);
            cleanedRateLimit++;
        }
    }

    if (
        cleanedResponseCache > 0 ||
        cleanedPromptCache > 0 ||
        cleanedRateLimit > 0
    ) {
        console.log(
            `🧹 [AI Cache] Response: ${cleanedResponseCache} | Prompt: ${cleanedPromptCache} | Rate: ${cleanedRateLimit}`
        );
    }

}, 1000 * 60 * 10);

/* =========================================================
   AI SERVICE
========================================================== */

class AiService {

    /* =======================================================
       RATE LIMIT
    ======================================================== */

    checkRateLimit(ip) {
        const now = Date.now();

        const key = ip || 'unknown';

        const rl = rateLimit.get(key) || {
            count: 0,
            resetAt: now + RATE_WINDOW
        };

        /* ---------------------------------------------------
           Reset window
        --------------------------------------------------- */

        if (now > rl.resetAt) {
            rl.count = 0;
            rl.resetAt = now + RATE_WINDOW;
        }

        /* ---------------------------------------------------
           Check limit
        --------------------------------------------------- */

        if (rl.count >= RATE_LIMIT) {
            return {
                allowed: false,
                retryAfter: Math.max(
                    1,
                    Math.ceil(
                        (rl.resetAt - now) / 1000
                    )
                )
            };
        }

        /* ---------------------------------------------------
           Increase counter
        --------------------------------------------------- */

        rl.count++;

        rateLimit.set(key, rl);

        return {
            allowed: true
        };
    }

    /* =======================================================
       RESPONSE CACHE
    ======================================================== */

    getCache(key) {
        const cached = cache.get(key);

        if (!cached) {
            return null;
        }

        if (
            Date.now() - cached.ts >
            CACHE_TTL
        ) {
            cache.delete(key);
            return null;
        }

        return cached;
    }

    /* =======================================================
       SET RESPONSE CACHE
    ======================================================== */

    setCache(key, value) {
        cache.set(key, {
            ...value,
            ts: Date.now()
        });

        /* ---------------------------------------------------
           Prevent unlimited memory growth
        --------------------------------------------------- */

        if (cache.size > CACHE_MAX_SIZE) {
            const oldest = [...cache.entries()]
                .sort(
                    (a, b) =>
                        a[1].ts - b[1].ts
                )[0];

            if (oldest) {
                cache.delete(oldest[0]);
            }
        }
    }

    /* =======================================================
       GET CINEMA CONTEXT
       
       Đây là phần tối ưu quan trọng nhất.
    ======================================================== */

    async getCinemaContext() {

        const now = Date.now();

        /* ---------------------------------------------------
           1. Context cache còn hạn
        --------------------------------------------------- */

        if (
            contextCache.data &&
            now - contextCache.timestamp <
                CONTEXT_CACHE_TTL
        ) {
            return {
                context: contextCache.data,
                cached: true
            };
        }

        /* ---------------------------------------------------
           2. Đang có request khác load DB
           
           Không query DB lần nữa.
        --------------------------------------------------- */

        if (contextCache.loadingPromise) {
            const context =
                await contextCache.loadingPromise;

            return {
                context,
                cached: true
            };
        }

        /* ---------------------------------------------------
           3. Load context mới
        --------------------------------------------------- */

        const startedAt = Date.now();

        contextCache.loadingPromise =
            MovieRepository
                .getFullContextForAI()
                .then((context) => {

                    contextCache.data =
                        context;

                    contextCache.timestamp =
                        Date.now();

                    console.log(
                        `⚡ [AI] Context refreshed in ${Date.now() - startedAt}ms`
                    );

                    return context;
                })
                .finally(() => {
                    contextCache.loadingPromise =
                        null;
                });

        const context =
            await contextCache.loadingPromise;

        return {
            context,
            cached: false
        };
    }

    /* =======================================================
       CLEAR CONTEXT CACHE
       
       Có thể gọi khi admin:
       - thêm phim
       - sửa phim
       - thêm suất
       - sửa giá
       - sửa khuyến mãi
       
       Ví dụ:
       AiService.clearContextCache();
    ======================================================== */

    clearContextCache() {
        contextCache.data = null;
        contextCache.timestamp = 0;

        // Không hủy loading promise nếu đang query.
        console.log(
            '♻️ [AI] Cinema context cache cleared'
        );
    }

    /* =======================================================
       DETECT INTENT
    ======================================================== */

    detectIntent(message) {
        const lower = String(
            message || ''
        ).toLowerCase();

        if (
            /(giá|bao nhiêu|price|vé|tiền|đồng|vnd)/.test(
                lower
            )
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

    /* =======================================================
       BUILD SYSTEM PROMPT
    ======================================================== */

    buildSystemPrompt(
        context,
        intent,
        userName = null
    ) {

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
                return (
                    `- ID ${m.movie_id}: ` +
                    `"${m.title}" ` +
                    `[${m.status}] | ` +
                    `${m.genres || 'N/A'} | ` +
                    `${m.duration}p | ` +
                    `T${m.age_rating} | ` +
                    `ĐD: ${m.director}`
                );
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

            showtimeByMovie[
                s.movie_id
            ].slots.push(
                `${s.start_time} | ${s.cinema_name} | ${s.room_name}`
            );
        });

        const showtimeList =
            Object.entries(
                showtimeByMovie
            )
                .map(([movieId, data]) => {

                    /*
                     * Chỉ đưa tối đa 6 suất / phim
                     * để prompt nhẹ hơn.
                     */
                    const slots =
                        data.slots
                            .slice(0, 6)
                            .join('\n   ');

                    return (
                        `📽️ ${data.title} ` +
                        `(ID ${movieId}):\n` +
                        `   ${slots}`
                    );
                })
                .join('\n\n') ||
            'Chưa có suất chiếu nào trong 7 ngày tới.';

        /* =====================================================
           CINEMAS
        ====================================================== */

        const cinemaList = cinemas
            .map((c) => {
                return (
                    `- ${c.cinema_name}: ` +
                    `${c.address} | ` +
                    `Hotline: ${c.hotline}`
                );
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

            const min =
                Number(
                    p.min_price
                ).toLocaleString('vi-VN');

            const max =
                Number(
                    p.max_price
                ).toLocaleString('vi-VN');

            const range =
                Number(p.min_price) ===
                Number(p.max_price)
                    ? `${min}đ`
                    : `${min}đ - ${max}đ`;

            summaryGroups[
                p.room_type
            ].push(
                `${p.seat_type}: ${range}`
            );
        });

        const priceSummaryList =
            Object.entries(
                summaryGroups
            )
                .map(([room, list]) => {
                    return (
                        `- ${room} → ` +
                        `${list.join(' | ')}`
                    );
                })
                .join('\n');

        /* =====================================================
           PRICE STANDARD
        ====================================================== */

        const standardGroups = {};

        priceStandard.forEach((p) => {

            const key =
                `${p.room_type} | ${p.day_type}`;

            if (!standardGroups[key]) {
                standardGroups[key] = [];
            }

            standardGroups[key].push(
                `${p.time_slot}: ` +
                `${Number(
                    p.price
                ).toLocaleString('vi-VN')}đ`
            );
        });

        const priceStandardList =
            Object.entries(
                standardGroups
            )
                .map(([key, values]) => {
                    return (
                        `- ${key} → ` +
                        `${values.join(' | ')}`
                    );
                })
                .join('\n');

        /* =====================================================
           PROMOTIONS
        ====================================================== */

        const promoList =
            promotions
                .map((p) => {

                    const desc =
                        (p.description || '')
                            .replace(
                                /<[^>]*>/g,
                                ''
                            )
                            .replace(
                                /&nbsp;/g,
                                ' '
                            )
                            .trim()
                            .slice(0, 80);

                    return (
                        `- ${p.title}: ${desc}`
                    );
                })
                .join('\n') ||
            'Hiện chưa có khuyến mãi.';

        /* =====================================================
           PRODUCTS
        ====================================================== */

        const productList =
            products
                .map((p) => {

                    return (
                        `- ${p.product_name} ` +
                        `(${p.category}): ` +
                        `${Number(
                            p.price
                        ).toLocaleString(
                            'vi-VN'
                        )}đ`
                    );
                })
                .join('\n');

        /* =====================================================
           USER INFO
        ====================================================== */

        const userInfo = userName
            ? `
👤 KHÁCH HÀNG ĐANG CHAT: "${userName}"

→ Thỉnh thoảng gọi tên khách trong câu trả lời.
Ví dụ: "${userName} ơi", "Dạ ${userName}".

CHỈ gọi tên 1 lần trong 1 câu trả lời.
Không lạm dụng.
`
            : '';

        /* =====================================================
           PROMPT
        ====================================================== */

        return `Bạn là "Cinema Assistant" — trợ lý tư vấn khách hàng của Quang Dũng Cinema.
${userInfo}
═══════════════════════════════════════════
🎯 PHONG CÁCH TRẢ LỜI
═══════════════════════════════════════════

Bạn là một NHÂN VIÊN TƯ VẤN THẬT đang nói chuyện với khách hàng.

Hãy trả lời:
- TỰ NHIÊN như người thật đang tư vấn.
- LỊCH SỰ và THÂN THIỆN.
- Có thể dùng emoji nhẹ như 🎬 🍿 😊.
- CÓ CHỦ NGỮ + VỊ NGỮ đầy đủ.
- Không trả lời cụt lủn.
- Không liệt kê khô khan.

═══════════════════════════════════════════
📝 QUY TẮC VIẾT CÂU
═══════════════════════════════════════════

1. Mọi câu phải có chủ ngữ + vị ngữ đầy đủ.

❌ Sai:
"75.000đ"

✅ Đúng:
"Ghế VIP ở phòng 2D có giá là 75.000đ ạ."

2. Khi liệt kê nhiều mục phải có câu dẫn.

❌ Sai:
"Galaxy Nguyễn Du, Galaxy Tân Bình"

✅ Đúng:
"Quang Dũng Cinema hiện có các chi nhánh sau ạ: ..."

3. Xưng hô:
- Gọi mình là "mình" hoặc "em".
- Gọi khách là "bạn" hoặc tên riêng.

4. Kết thúc câu nên lịch sự:
- "ạ"
- "nhé"
- "bạn nhé"

5. Khi không có thông tin:
- Xin lỗi lịch sự.
- Không được bịa.
- Gợi ý câu hỏi khác.

═══════════════════════════════════════════
🚫 RÀNG BUỘC
═══════════════════════════════════════════

- CHỈ sử dụng dữ liệu được cung cấp.
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

- Rạp có 4 loại phòng:
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
💰 QUY TẮC GIÁ VÉ
═══════════════════════════════════════════

1. Nếu user hỏi chung:
→ Trả lời RANGE giá.
→ Hỏi lại phòng/giờ cụ thể.

2. Nếu user hỏi cụ thể:
→ Trả lời chính xác 1 con số.

3. Khi trả lời giá phải nêu rõ:
- Hạng ghế.
- Loại phòng.
- Khung giờ.
- Loại ngày.

═══════════════════════════════════════════
📊 DỮ LIỆU THỰC TẾ
═══════════════════════════════════════════

📽️ DANH SÁCH PHIM:
${movieList}

🎬 SUẤT CHIẾU 7 NGÀY TỚI:
${showtimeList}

🏢 HỆ THỐNG RẠP:
${cinemaList}

💰 TÓM TẮT GIÁ THEO HẠNG GHẾ:
${priceSummaryList}

💰 GIÁ GHẾ STANDARD:
${priceStandardList}

🎁 KHUYẾN MÃI:
${promoList}

🍿 COMBO:
${productList}

═══════════════════════════════════════════
⚠️ ĐỊNH DẠNG TRẢ VỀ
═══════════════════════════════════════════

BẮT BUỘC trả về CHỈ MỘT OBJECT JSON.

KHÔNG markdown.
KHÔNG \`\`\`json.
KHÔNG text bên ngoài JSON.

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

    /* =======================================================
       GET CACHED PROMPT
    ======================================================== */

    getCachedPrompt(
        context,
        intent,
        userName
    ) {

        /*
         * Context timestamp được dùng làm version.
         * Khi context refresh thì prompt cache tự thay đổi.
         */

        const contextVersion =
            contextCache.timestamp;

        const key =
            `${contextVersion}|${intent}|${userName || 'guest'}`;

        const cached =
            promptCache.get(key);

        if (cached) {

            if (
                Date.now() - cached.ts <
                PROMPT_CACHE_TTL
            ) {
                return cached.prompt;
            }

            promptCache.delete(key);
        }

        const prompt =
            this.buildSystemPrompt(
                context,
                intent,
                userName
            );

        promptCache.set(key, {
            prompt,
            ts: Date.now()
        });

        /* ---------------------------------------------------
           Prevent unlimited prompt cache
        --------------------------------------------------- */

        if (
            promptCache.size >
            PROMPT_CACHE_MAX_SIZE
        ) {

            const oldest =
                [...promptCache.entries()]
                    .sort(
                        (a, b) =>
                            a[1].ts -
                            b[1].ts
                    )[0];

            if (oldest) {
                promptCache.delete(
                    oldest[0]
                );
            }
        }

        return prompt;
    }

    /* =======================================================
       NORMALIZE GEMINI ERROR
    ======================================================== */

    normalizeGeminiError(error) {

        const status =
            error?.status ??
            error?.statusCode ??
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
                    code:
                        error?.code ??
                        null,
                    message
                },
                null,
                2
            )
        );

        const normalized =
            new Error(message);

        normalized.status =
            Number.isFinite(
                Number(status)
            )
                ? Number(status)
                : status;

        normalized.code =
            error?.code;

        normalized.originalError =
            error;

        return normalized;
    }

    /* =======================================================
       PARSE AI RESPONSE
    ======================================================== */

    parseAIResponse(rawContent) {

        if (!rawContent) {
            return {
                reply:
                    'Xin lỗi, mình chưa nhận được câu trả lời từ hệ thống.',
                movie_ids: []
            };
        }

        try {

            let cleaned =
                String(
                    rawContent
                ).trim();

            /* -----------------------------------------------
               Remove markdown fence
            ------------------------------------------------ */

            if (
                cleaned.startsWith(
                    '```json'
                )
            ) {
                cleaned =
                    cleaned.slice(7);
            }
            else if (
                cleaned.startsWith(
                    '```'
                )
            ) {
                cleaned =
                    cleaned.slice(3);
            }

            if (
                cleaned.endsWith(
                    '```'
                )
            ) {
                cleaned =
                    cleaned.slice(
                        0,
                        -3
                    );
            }

            cleaned =
                cleaned.trim();

            /* -----------------------------------------------
               Parse
            ------------------------------------------------ */

            const parsed =
                JSON.parse(cleaned);

            return {
                reply:
                    typeof parsed.reply ===
                    'string'
                        ? parsed.reply.trim()
                        : 'Xin lỗi, mình chưa có câu trả lời phù hợp.',

                movie_ids:
                    Array.isArray(
                        parsed.movie_ids
                    )
                        ? parsed.movie_ids
                        : []
            };

        }
        catch (error) {

            console.warn(
                '⚠️ [AI Service] Parse JSON failed:',
                error?.message
            );

            return {
                reply:
                    String(
                        rawContent
                    ).trim() ||
                    'Xin lỗi, mình chưa hiểu câu hỏi của bạn.',

                movie_ids: []
            };
        }
    }

    /* =======================================================
       BUILD SUGGESTED MOVIES
    ======================================================== */

    buildSuggestedMovies(
        movieIds,
        movies
    ) {

        const validIds =
            Array.isArray(
                movieIds
            )
                ? movieIds
                    .map(Number)
                    .filter(
                        (id) =>
                            Number.isInteger(
                                id
                            ) &&
                            id > 0
                    )
                    .filter(
                        (id) =>
                            movies.some(
                                (movie) =>
                                    Number(
                                        movie.movie_id
                                    ) === id
                            )
                    )
                : [];

        return movies
            .filter((movie) =>
                validIds.includes(
                    Number(
                        movie.movie_id
                    )
                )
            )
            .slice(0, 3)
            .map((movie) => ({
                movie_id:
                    movie.movie_id,

                title:
                    movie.title,

                slug:
                    movie.slug,

                movie_poster:
                    movie.movie_poster,

                duration:
                    movie.duration,

                age_rating:
                    movie.age_rating,

                genres:
                    movie.genres
                        ? movie.genres
                            .split(',')
                            .map(
                                (genre) =>
                                    genre.trim()
                            )
                            .filter(
                                Boolean
                            )
                        : []
            }));
    }

    /* =======================================================
       MAIN CHAT
    ======================================================== */

    async chat({
        message,
        history = [],
        userName = null
    }) {

        const totalStartedAt =
            Date.now();

        /* =====================================================
           CHECK API KEY
        ====================================================== */

        if (!GEMINI_API_KEY) {

            const error =
                new Error(
                    'GEMINI_API_KEY chưa được cấu hình trong environment.'
                );

            error.status = 500;
            error.code =
                'GEMINI_API_KEY_MISSING';

            throw error;
        }

        /* =====================================================
           GET CINEMA CONTEXT
        ====================================================== */

        const contextStartedAt =
            Date.now();

        const {
            context,
            cached: contextCached
        } =
            await this.getCinemaContext();

        const contextTime =
            Date.now() -
            contextStartedAt;

        console.log(
            `⚡ [AI] Context: ${contextTime}ms | ${
                contextCached
                    ? 'CACHE'
                    : 'DB'
            }`
        );

        /* =====================================================
           CHECK MOVIES
        ====================================================== */

        if (
            !context ||
            !Array.isArray(
                context.movies
            ) ||
            context.movies.length === 0
        ) {

            return {
                reply:
                    'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!',
                movies: []
            };
        }

        /* =====================================================
           INTENT
        ====================================================== */

        const intent =
            this.detectIntent(
                message
            );

        console.log(
            `🎯 [AI] Intent: ${intent} | User: ${
                userName || 'guest'
            } | Message: "${String(
                message
            ).slice(0, 60)}"`
        );

        /* =====================================================
           GET SYSTEM PROMPT
        ====================================================== */

        const promptStartedAt =
            Date.now();

        const systemPrompt =
            this.getCachedPrompt(
                context,
                intent,
                userName
            );

        const promptTime =
            Date.now() -
            promptStartedAt;

        console.log(
            `⚡ [AI] Prompt: ${promptTime}ms | Length: ${systemPrompt.length} chars`
        );

        /* =====================================================
           BUILD HISTORY
        ====================================================== */

        let geminiHistory =
            Array.isArray(history)
                ? history
                    .slice(
                        -MAX_HISTORY
                    )
                    .map((h) => ({
                        role:
                            h.role ===
                            'user'
                                ? 'user'
                                : 'model',

                        parts: [
                            {
                                text: String(
                                    h.content ||
                                    ''
                                )
                            }
                        ]
                    }))
                    .filter(
                        (h) =>
                            h.parts[0]
                                .text
                                .trim()
                                .length > 0
                    )
                : [];

        /* =====================================================
           GEMINI HISTORY VALIDATION
        ====================================================== */

        while (
            geminiHistory.length >
                0 &&
            geminiHistory[0].role ===
                'model'
        ) {
            geminiHistory.shift();
        }

        /* =====================================================
           CREATE CHAT
        ====================================================== */

        const chat =
            genAI.chats.create({

                model:
                    MODEL_NAME,

                history:
                    geminiHistory,

                config: {

                    systemInstruction:
                        systemPrompt,

                    temperature:
                        TEMPERATURE,

                    maxOutputTokens:
                        MAX_TOKENS,

                    responseMimeType:
                        'application/json'
                }
            });

        /* =====================================================
           GEMINI REQUEST
        ====================================================== */

        const geminiStartedAt =
            Date.now();

        let response;

        try {

            response =
                await chat.sendMessage({
                    message
                });

        }
        catch (error) {

            const normalized =
                this.normalizeGeminiError(
                    error
                );

            if (
                normalized.status ===
                403
            ) {
                console.error(
                    '🚫 [Gemini] 403 PERMISSION_DENIED — kiểm tra GEMINI_API_KEY và quyền Gemini API.'
                );
            }

            if (
                normalized.status ===
                429
            ) {
                console.warn(
                    '⏳ [Gemini] 429 RATE LIMIT / QUOTA'
                );
            }

            if (
                normalized.status ===
                503
            ) {
                console.warn(
                    '⚠️ [Gemini] 503 SERVICE_UNAVAILABLE'
                );
            }

            throw normalized;
        }

        const geminiTime =
            Date.now() -
            geminiStartedAt;

        console.log(
            `⚡ [AI] Gemini: ${geminiTime}ms`
        );

        /* =====================================================
           RESPONSE TEXT
        ====================================================== */

        const rawContent =
            response?.text || '';

        console.log(
            `📥 [AI] Raw response: ${rawContent.slice(
                0,
                200
            )}`
        );

        /* =====================================================
           PARSE
        ====================================================== */

        const parseStartedAt =
            Date.now();

        const aiResponse =
            this.parseAIResponse(
                rawContent
            );

        const parseTime =
            Date.now() -
            parseStartedAt;

        console.log(
            `⚡ [AI] Parse: ${parseTime}ms`
        );

        /* =====================================================
           SUGGESTED MOVIES
        ====================================================== */

        const suggestedMovies =
            this.buildSuggestedMovies(
                aiResponse.movie_ids,
                context.movies
            );

        /* =====================================================
           TOTAL
        ====================================================== */

        const totalTime =
            Date.now() -
            totalStartedAt;

        console.log(
            `🚀 [AI] TOTAL: ${totalTime}ms`
        );

        /* =====================================================
           FINAL RESPONSE
        ====================================================== */

        return {
            reply:
                aiResponse.reply ||
                'Xin lỗi, mình chưa có câu trả lời.',

            movies:
                suggestedMovies
        };
    }
}

/* =========================================================
   EXPORT SINGLETON
========================================================== */

module.exports = new AiService();
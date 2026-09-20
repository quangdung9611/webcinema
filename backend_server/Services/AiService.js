// ============================================================
// SERVICES / AiService.js
// QUANG DŨNG CINEMA — AI CINEMA ASSISTANT v4
// ============================================================
// NÂNG CẤP:
//
// - Gemini Streaming
// - Stream chunk ổn định
// - Frontend có thể render từng chữ
// - Thinking state được xử lý ở frontend
// - Cache response
// - Cache cinema context
// - Cache system prompt
// - Rate limit
// - Movie suggestion
// - History
// - Không dùng responseMimeType khi streaming
// ============================================================

const { GoogleGenAI } = require('@google/genai');
const MovieRepository = require('../Repositories/MovieRepository');

/* ============================================================
   GEMINI CLIENT
============================================================ */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error(
        '❌ [Gemini] GEMINI_API_KEY chưa được load từ environment.'
    );
}

const genAI = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
});

/* ============================================================
   CONFIG
============================================================ */

const MODEL_NAME = 'gemini-3.6-flash';

/*
 * Temperature vừa phải để AI:
 * - tự nhiên
 * - không quá lan man
 * - trả lời ổn định
 */
const TEMPERATURE = 0.5;

/*
 * Giới hạn output.
 */
const MAX_TOKENS = 768;

/*
 * Response cache.
 */
const CACHE_TTL = 1000 * 60 * 60 * 4;
const CACHE_MAX_SIZE = 500;

/*
 * Cinema context cache.
 */
const CONTEXT_CACHE_TTL = 1000 * 60 * 3;

/*
 * Prompt cache.
 */
const PROMPT_CACHE_TTL = 1000 * 60 * 3;
const PROMPT_CACHE_MAX_SIZE = 100;

/*
 * Rate limit.
 */
const RATE_LIMIT = 10;
const RATE_WINDOW = 1000 * 60;

/*
 * History gửi Gemini.
 */
const MAX_HISTORY = 6;

/* ============================================================
   MEMORY CACHE
============================================================ */

const cache = new Map();

const rateLimit = new Map();

const contextCache = {
    data: null,
    timestamp: 0,
    loadingPromise: null
};

const promptCache = new Map();

/* ============================================================
   CACHE CLEANUP
============================================================ */

setInterval(() => {
    const now = Date.now();

    /* --------------------------------------------------------
       RESPONSE CACHE
    -------------------------------------------------------- */

    let cleanedResponseCache = 0;

    for (const [key, value] of cache.entries()) {
        if (now - value.ts > CACHE_TTL) {
            cache.delete(key);
            cleanedResponseCache++;
        }
    }

    /* --------------------------------------------------------
       PROMPT CACHE
    -------------------------------------------------------- */

    let cleanedPromptCache = 0;

    for (const [key, value] of promptCache.entries()) {
        if (now - value.ts > PROMPT_CACHE_TTL) {
            promptCache.delete(key);
            cleanedPromptCache++;
        }
    }

    /* --------------------------------------------------------
       RATE LIMIT
    -------------------------------------------------------- */

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
            `🧹 [AI Cache] Response: ${cleanedResponseCache} | ` +
            `Prompt: ${cleanedPromptCache} | ` +
            `Rate: ${cleanedRateLimit}`
        );
    }
}, 1000 * 60 * 10);

/* ============================================================
   AI SERVICE
============================================================ */

class AiService {

    /* ========================================================
       RATE LIMIT
    ======================================================== */

    checkRateLimit(ip) {
        const now = Date.now();
        const key = ip || 'unknown';

        const rl = rateLimit.get(key) || {
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
                retryAfter: Math.max(
                    1,
                    Math.ceil((rl.resetAt - now) / 1000)
                )
            };
        }

        rl.count++;

        rateLimit.set(key, rl);

        return {
            allowed: true
        };
    }

    /* ========================================================
       RESPONSE CACHE
    ======================================================== */

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

    /* ========================================================
       GET CINEMA CONTEXT
    ======================================================== */

    async getCinemaContext() {
        const now = Date.now();

        /*
         * Context còn hạn.
         */
        if (
            contextCache.data &&
            now - contextCache.timestamp < CONTEXT_CACHE_TTL
        ) {
            return {
                context: contextCache.data,
                cached: true
            };
        }

        /*
         * Nếu request khác đang load DB
         * thì dùng chung Promise.
         */
        if (contextCache.loadingPromise) {
            const context = await contextCache.loadingPromise;

            return {
                context,
                cached: true
            };
        }

        const startedAt = Date.now();

        contextCache.loadingPromise = MovieRepository
            .getFullContextForAI()
            .then((context) => {
                contextCache.data = context;
                contextCache.timestamp = Date.now();

                console.log(
                    `⚡ [AI] Context refreshed in ${Date.now() - startedAt}ms`
                );

                return context;
            })
            .finally(() => {
                contextCache.loadingPromise = null;
            });

        const context = await contextCache.loadingPromise;

        return {
            context,
            cached: false
        };
    }

    /* ========================================================
       CLEAR CONTEXT CACHE
    ======================================================== */

    clearContextCache() {
        contextCache.data = null;
        contextCache.timestamp = 0;

        console.log(
            '♻️ [AI] Cinema context cache cleared'
        );
    }

    /* ========================================================
       DETECT INTENT
    ======================================================== */

    detectIntent(message) {
        const lower = String(message || '').toLowerCase();

        if (
            /(giá|bao nhiêu|price|vé|tiền|đồng|vnd)/
                .test(lower)
        ) {
            return 'price';
        }

        if (
            /(suất|giờ|mấy giờ|khi nào|chiếu lúc|showtime|time)/
                .test(lower)
        ) {
            return 'showtime';
        }

        if (
            /(rạp|địa chỉ|ở đâu|hotline|đường|quận|thành phố|address)/
                .test(lower)
        ) {
            return 'cinema';
        }

        if (
            /(khuyến mãi|giảm giá|ưu đãi|combo|bắp|nước|promo|voucher)/
                .test(lower)
        ) {
            return 'promotion';
        }

        if (
            /(phim|đang chiếu|sắp chiếu|hay|gợi ý|đề xuất|thể loại|movie)/
                .test(lower)
        ) {
            return 'movie';
        }

        return 'general';
    }

    /* ========================================================
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

        /* ----------------------------------------------------
           MOVIES
        ---------------------------------------------------- */

        const movieList = movies
            .map((m) =>
                `- ID ${m.movie_id}: "${m.title}" ` +
                `[${m.status}] | ${m.genres || 'N/A'} | ` +
                `${m.duration}p | T${m.age_rating} | ` +
                `ĐD: ${m.director}`
            )
            .join('\n');

        /* ----------------------------------------------------
           SHOWTIMES
        ---------------------------------------------------- */

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
                const slots = data.slots
                    .slice(0, 4)
                    .join('\n   ');

                return (
                    `📽️ ${data.title} (ID ${movieId}):\n` +
                    `   ${slots}`
                );
            })
            .join('\n\n')
            || 'Chưa có suất chiếu nào trong 7 ngày tới.';

        /* ----------------------------------------------------
           CINEMAS
        ---------------------------------------------------- */

        const cinemaList = cinemas
            .map((c) =>
                `- ${c.cinema_name}: ${c.address} | ` +
                `Hotline: ${c.hotline}`
            )
            .join('\n');

        /* ----------------------------------------------------
           PRICE SUMMARY
        ---------------------------------------------------- */

        const summaryGroups = {};

        priceSummary.forEach((p) => {
            if (!summaryGroups[p.room_type]) {
                summaryGroups[p.room_type] = [];
            }

            const min = Number(p.min_price)
                .toLocaleString('vi-VN');

            const max = Number(p.max_price)
                .toLocaleString('vi-VN');

            const range =
                Number(p.min_price) === Number(p.max_price)
                    ? `${min}đ`
                    : `${min}đ - ${max}đ`;

            summaryGroups[p.room_type].push(
                `${p.seat_type}: ${range}`
            );
        });

        const priceSummaryList = Object.entries(summaryGroups)
            .map(
                ([room, list]) =>
                    `- ${room} → ${list.join(' | ')}`
            )
            .join('\n');

        /* ----------------------------------------------------
           STANDARD PRICE
        ---------------------------------------------------- */

        const standardGroups = {};

        priceStandard.forEach((p) => {
            const key = `${p.room_type} | ${p.day_type}`;

            if (!standardGroups[key]) {
                standardGroups[key] = [];
            }

            standardGroups[key].push(
                `${p.time_slot}: ` +
                `${Number(p.price).toLocaleString('vi-VN')}đ`
            );
        });

        const priceStandardList = Object.entries(
            standardGroups
        )
            .map(
                ([key, values]) =>
                    `- ${key} → ${values.join(' | ')}`
            )
            .join('\n');

        /* ----------------------------------------------------
           PROMOTIONS
        ---------------------------------------------------- */

        const promoList = promotions
            .map((p) => {
                const desc = (p.description || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim()
                    .slice(0, 120);

                return `- ${p.title}: ${desc}`;
            })
            .join('\n')
            || 'Hiện chưa có khuyến mãi.';

        /* ----------------------------------------------------
           PRODUCTS
        ---------------------------------------------------- */

        const productList = products
            .map(
                (p) =>
                    `- ${p.product_name} (${p.category}): ` +
                    `${Number(p.price).toLocaleString('vi-VN')}đ`
            )
            .join('\n');

        /* ----------------------------------------------------
           USER
        ---------------------------------------------------- */

        const userInfo = userName
            ? `
👤 KHÁCH HÀNG: "${userName}"
→ Thỉnh thoảng gọi tên khách.
→ Không cần gọi tên ở mọi câu.
`
            : '';

        /* ----------------------------------------------------
           PROMPT
        ---------------------------------------------------- */

        return `
Bạn là "Cinema Assistant" — trợ lý AI chính thức của Quang Dũng Cinema.

${userInfo}

════════════════════════════════════════════
🎯 VAI TRÒ
════════════════════════════════════════════

Bạn đang nói chuyện trực tiếp với khách hàng của rạp.

Hãy trả lời như một nhân viên tư vấn thật:

- Tự nhiên.
- Lịch sự.
- Thân thiện.
- Ngắn gọn.
- Dễ hiểu.
- Không máy móc.
- Không lặp lại câu hỏi của khách nếu không cần thiết.

Xưng "mình"/"em".
Gọi khách là "bạn".
Có thể dùng "ạ", "nhé", "nha" một cách tự nhiên.

Có thể dùng emoji nhẹ:
🎬 🍿 🎟️ 📍 😊 🎥

════════════════════════════════════════════
📝 FORMAT TRẢ LỜI
════════════════════════════════════════════

Nếu trả lời ngắn:
→ 2-3 câu.

Nếu có nhiều thông tin:
→ dùng bullet.

Nếu gợi ý phim:
→ chỉ gợi ý phim thực sự có trong dữ liệu.

Không viết quá dài nếu khách chỉ hỏi một câu đơn giản.

════════════════════════════════════════════
🚫 QUY TẮC DỮ LIỆU
════════════════════════════════════════════

- CHỈ sử dụng dữ liệu được cung cấp bên dưới.
- KHÔNG bịa tên phim.
- KHÔNG bịa giá vé.
- KHÔNG bịa suất chiếu.
- KHÔNG bịa địa chỉ.
- KHÔNG bịa khuyến mãi.
- KHÔNG bịa combo.
- KHÔNG tiết lộ thông tin khách hàng.
- Nếu không có dữ liệu → nói rõ chưa có thông tin.
- Nếu hỏi ngoài chủ đề cinema → từ chối lịch sự.

════════════════════════════════════════════
🎬 QUY TẮC RẠP
════════════════════════════════════════════

Rạp có 4 loại phòng:

- 2D
- 3D
- VIP
- IMAX

KHÔNG CÓ 4DMAX.

Hạng ghế:

- STANDARD
- VIP
- DELUXE
- RECLINER
- COUPLE

Khung giờ:

- MORNING
- AFTERNOON
- EVENING
- NIGHT

Loại ngày:

- WEEKDAY: Thứ 2 - Thứ 6
- WEEKEND: Thứ 7 - Chủ nhật

════════════════════════════════════════════
💰 QUY TẮC GIÁ
════════════════════════════════════════════

Nếu khách hỏi giá chung:
→ đưa khoảng giá.

Nếu khách hỏi giá cụ thể:
→ đưa đúng mức giá trong dữ liệu.

Nếu cần:
→ nêu rõ hạng ghế + phòng + khung giờ + ngày.

════════════════════════════════════════════
🎯 INTENT HIỆN TẠI
════════════════════════════════════════════

${intent}

════════════════════════════════════════════
📊 DỮ LIỆU QUANG DŨNG CINEMA
════════════════════════════════════════════

📽️ PHIM:

${movieList || 'Chưa có dữ liệu phim.'}

════════════════════════════════════════════

🎬 SUẤT CHIẾU:

${showtimeList}

════════════════════════════════════════════

🏢 RẠP:

${cinemaList || 'Chưa có dữ liệu rạp.'}

════════════════════════════════════════════

💰 GIÁ THEO HẠNG GHẾ:

${priceSummaryList || 'Chưa có dữ liệu giá.'}

════════════════════════════════════════════

💰 GIÁ GHẾ STANDARD:

${priceStandardList || 'Chưa có dữ liệu giá.'}

════════════════════════════════════════════

🎁 KHUYẾN MÃI:

${promoList}

════════════════════════════════════════════

🍿 COMBO:

${productList || 'Chưa có dữ liệu combo.'}

════════════════════════════════════════════
🎬 GỢI Ý PHIM
════════════════════════════════════════════

Nếu bạn gợi ý phim cụ thể, hãy thêm tag:

[ID: x]

Ví dụ:

Dạ, hiện tại phim này đang được chiếu ạ. Bạn muốn mình tìm suất chiếu phù hợp không? [ID: 5]

Nếu nhiều phim:

[ID: 5] [ID: 4]

Nếu không gợi ý phim:
→ KHÔNG thêm tag.

════════════════════════════════════════════
⚡ QUAN TRỌNG CHO STREAMING
════════════════════════════════════════════

Trả lời bằng TEXT TIẾNG VIỆT TỰ NHIÊN.

KHÔNG trả JSON.

Không sử dụng markdown code block.

Không giải thích cách bạn suy luận.

Không nói "theo dữ liệu được cung cấp" trừ khi thật sự cần thiết.
`;
    }

    /* ========================================================
       GET CACHED PROMPT
    ======================================================== */

    getCachedPrompt(
        context,
        intent,
        userName
    ) {
        const contextVersion = contextCache.timestamp;

        const key =
            `${contextVersion}|${intent}|${userName || 'guest'}`;

        const cached = promptCache.get(key);

        if (cached) {
            if (
                Date.now() - cached.ts <
                PROMPT_CACHE_TTL
            ) {
                return cached.prompt;
            }

            promptCache.delete(key);
        }

        const prompt = this.buildSystemPrompt(
            context,
            intent,
            userName
        );

        promptCache.set(key, {
            prompt,
            ts: Date.now()
        });

        if (
            promptCache.size >
            PROMPT_CACHE_MAX_SIZE
        ) {
            const oldest = [...promptCache.entries()]
                .sort(
                    (a, b) =>
                        a[1].ts - b[1].ts
                )[0];

            if (oldest) {
                promptCache.delete(oldest[0]);
            }
        }

        return prompt;
    }

    /* ========================================================
       NORMALIZE GEMINI ERROR
    ======================================================== */

    normalizeGeminiError(error) {
        const status =
            error?.status ??
            error?.statusCode ??
            error?.error?.status ??
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
                    message
                },
                null,
                2
            )
        );

        const normalized = new Error(message);

        normalized.status =
            Number.isFinite(Number(status))
                ? Number(status)
                : status;

        normalized.code = error?.code;
        normalized.originalError = error;

        return normalized;
    }

    /* ========================================================
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
                String(rawContent).trim();

            if (
                cleaned.startsWith('```json')
            ) {
                cleaned =
                    cleaned.slice(7);
            } else if (
                cleaned.startsWith('```')
            ) {
                cleaned =
                    cleaned.slice(3);
            }

            if (
                cleaned.endsWith('```')
            ) {
                cleaned =
                    cleaned.slice(0, -3);
            }

            cleaned = cleaned.trim();

            const parsed =
                JSON.parse(cleaned);

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
                '⚠️ [AI] Parse JSON failed:',
                error?.message
            );

            return {
                reply:
                    String(rawContent).trim() ||
                    'Xin lỗi, mình chưa hiểu câu hỏi.',

                movie_ids: []
            };
        }
    }

    /* ========================================================
       PARSE STREAM RESPONSE
    ======================================================== */

    parseStreamResponse(text) {
        if (!text) {
            return {
                reply: '',
                movie_ids: []
            };
        }

        let cleaned =
            String(text).trim();

        /* ----------------------------------------------------
           Try JSON
        ---------------------------------------------------- */

        try {
            let jsonClean = cleaned;

            if (
                jsonClean.startsWith('```json')
            ) {
                jsonClean =
                    jsonClean.slice(7);
            } else if (
                jsonClean.startsWith('```')
            ) {
                jsonClean =
                    jsonClean.slice(3);
            }

            if (
                jsonClean.endsWith('```')
            ) {
                jsonClean =
                    jsonClean.slice(0, -3);
            }

            jsonClean =
                jsonClean.trim();

            const parsed =
                JSON.parse(jsonClean);

            if (parsed.reply) {
                return {
                    reply: parsed.reply,
                    movie_ids:
                        Array.isArray(
                            parsed.movie_ids
                        )
                            ? parsed.movie_ids
                            : []
                };
            }

        } catch {
            /*
             * Không phải JSON.
             * Streaming bình thường.
             */
        }

        /* ----------------------------------------------------
           Extract movie IDs
        ---------------------------------------------------- */

        const movieIds = [];

        const matches =
            cleaned.matchAll(
                /\[ID:\s*(\d+)\]/g
            );

        for (const match of matches) {
            movieIds.push(
                Number(match[1])
            );
        }

        /* ----------------------------------------------------
           Remove movie ID tags
        ---------------------------------------------------- */

        const cleanReply =
            cleaned
                .replace(
                    /\[ID:\s*\d+\]/g,
                    ''
                )
                .trim();

        return {
            reply: cleanReply,
            movie_ids: movieIds
        };
    }

    /* ========================================================
       BUILD SUGGESTED MOVIES
    ======================================================== */

    buildSuggestedMovies(
        movieIds,
        movies
    ) {
        const validIds =
            Array.isArray(movieIds)
                ? movieIds
                    .map(Number)
                    .filter(
                        (id) =>
                            Number.isInteger(id) &&
                            id > 0
                    )
                    .filter(
                        (id) =>
                            movies.some(
                                (m) =>
                                    Number(
                                        m.movie_id
                                    ) === id
                            )
                    )
                : [];

        return movies
            .filter((m) =>
                validIds.includes(
                    Number(m.movie_id)
                )
            )
            .slice(0, 3)
            .map((m) => ({
                movie_id:
                    m.movie_id,

                title:
                    m.title,

                slug:
                    m.slug,

                movie_poster:
                    m.movie_poster,

                duration:
                    m.duration,

                age_rating:
                    m.age_rating,

                genres:
                    m.genres
                        ? m.genres
                            .split(',')
                            .map(
                                (g) =>
                                    g.trim()
                            )
                            .filter(Boolean)
                        : []
            }));
    }

    /* ========================================================
       BUILD GEMINI HISTORY
    ======================================================== */

    buildGeminiHistory(history) {
        let geminiHistory =
            Array.isArray(history)
                ? history
                    .slice(-MAX_HISTORY)
                    .map((h) => ({
                        role:
                            h.role === 'user'
                                ? 'user'
                                : 'model',

                        parts: [
                            {
                                text:
                                    String(
                                        h.content ||
                                        ''
                                    )
                            }
                        ]
                    }))
                    .filter(
                        (h) =>
                            h.parts[0].text
                                .trim()
                                .length > 0
                    )
                : [];

        /*
         * Gemini yêu cầu history bắt đầu
         * bằng user.
         */
        while (
            geminiHistory.length > 0 &&
            geminiHistory[0].role === 'model'
        ) {
            geminiHistory.shift();
        }

        /*
         * Đảm bảo history không kết thúc
         * bằng model.
         */
        while (
            geminiHistory.length > 0 &&
            geminiHistory[
                geminiHistory.length - 1
            ].role === 'model'
        ) {
            geminiHistory.pop();
        }

        return geminiHistory;
    }

    /* ========================================================
       CREATE CHAT
    ======================================================== */

    createChat({
        systemPrompt,
        history
    }) {
        return genAI.chats.create({
            model: MODEL_NAME,

            history,

            config: {
                systemInstruction:
                    systemPrompt,

                temperature:
                    TEMPERATURE,

                maxOutputTokens:
                    MAX_TOKENS
            }
        });
    }

    /* ========================================================
       NORMAL CHAT
    ======================================================== */

    async chat({
        message,
        history = [],
        userName = null
    }) {
        const totalStartedAt =
            Date.now();

        if (!GEMINI_API_KEY) {
            const error =
                new Error(
                    'GEMINI_API_KEY chưa được cấu hình.'
                );

            error.status = 500;
            error.code =
                'GEMINI_API_KEY_MISSING';

            throw error;
        }

        const {
            context,
            cached: contextCached
        } = await this.getCinemaContext();

        console.log(
            `⚡ [AI] Context: ` +
            `${Date.now() - totalStartedAt}ms | ` +
            `${contextCached ? 'CACHE' : 'DB'}`
        );

        if (
            !context ||
            !Array.isArray(context.movies) ||
            context.movies.length === 0
        ) {
            return {
                reply:
                    'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!',

                movies: []
            };
        }

        const intent =
            this.detectIntent(message);

        const systemPrompt =
            this.getCachedPrompt(
                context,
                intent,
                userName
            );

        const geminiHistory =
            this.buildGeminiHistory(
                history
            );

        const chat =
            this.createChat({
                systemPrompt,
                history: geminiHistory
            });

        const geminiStartedAt =
            Date.now();

        let response;

        try {
            response =
                await chat.sendMessage({
                    message
                });
        } catch (error) {
            throw this.normalizeGeminiError(
                error
            );
        }

        console.log(
            `⚡ [AI] Gemini: ` +
            `${Date.now() - geminiStartedAt}ms`
        );

        const rawContent =
            response?.text || '';

        const aiResponse =
            this.parseAIResponse(
                rawContent
            );

        const suggestedMovies =
            this.buildSuggestedMovies(
                aiResponse.movie_ids,
                context.movies
            );

        console.log(
            `🚀 [AI] TOTAL: ` +
            `${Date.now() - totalStartedAt}ms`
        );

        return {
            reply:
                aiResponse.reply ||
                'Xin lỗi, mình chưa có câu trả lời.',

            movies:
                suggestedMovies
        };
    }

    /* ========================================================
       STREAM CHAT
    ======================================================== */

    async *chatStream({
        message,
        history = [],
        userName = null
    }) {
        const totalStartedAt =
            Date.now();

        if (!GEMINI_API_KEY) {
            const error =
                new Error(
                    'GEMINI_API_KEY chưa được cấu hình.'
                );

            error.status = 500;
            error.code =
                'GEMINI_API_KEY_MISSING';

            throw error;
        }

        /* ----------------------------------------------------
           LOAD CONTEXT
        ---------------------------------------------------- */

        const {
            context,
            cached: contextCached
        } = await this.getCinemaContext();

        console.log(
            `⚡ [AI Stream] Context: ` +
            `${Date.now() - totalStartedAt}ms | ` +
            `${contextCached ? 'CACHE' : 'DB'}`
        );

        if (
            !context ||
            !Array.isArray(context.movies) ||
            context.movies.length === 0
        ) {
            yield {
                type: 'text',

                content:
                    'Dạ, hiện tại rạp chưa có phim nào đang chiếu ạ. Bạn quay lại sau nhé!'
            };

            yield {
                type: 'done',
                movies: []
            };

            return;
        }

        /* ----------------------------------------------------
           INTENT
        ---------------------------------------------------- */

        const intent =
            this.detectIntent(message);

        /* ----------------------------------------------------
           PROMPT
        ---------------------------------------------------- */

        const systemPrompt =
            this.getCachedPrompt(
                context,
                intent,
                userName
            );

        /* ----------------------------------------------------
           HISTORY
        ---------------------------------------------------- */

        const geminiHistory =
            this.buildGeminiHistory(
                history
            );

        /* ----------------------------------------------------
           CHAT
        ---------------------------------------------------- */

        const chat =
            this.createChat({
                systemPrompt,
                history: geminiHistory
            });

        let fullText = '';

        let chunkCount = 0;

        const geminiStartedAt =
            Date.now();

        try {
            const stream =
                await chat.sendMessageStream({
                    message
                });

            for await (
                const chunk of stream
            ) {
                const text =
                    chunk?.text || '';

                if (!text) {
                    continue;
                }

                chunkCount++;

                fullText += text;

                /*
                 * Gửi chunk NGAY LẬP TỨC.
                 *
                 * Frontend sẽ tự tạo hiệu ứng
                 * từng chữ.
                 */
                yield {
                    type: 'text',
                    content: text
                };
            }

            console.log(
                `⚡ [AI Stream] Gemini: ` +
                `${Date.now() - geminiStartedAt}ms | ` +
                `chunks: ${chunkCount}`
            );

        } catch (error) {
            throw this.normalizeGeminiError(
                error
            );
        }

        /* ----------------------------------------------------
           PARSE FINAL RESPONSE
        ---------------------------------------------------- */

        const aiResponse =
            this.parseStreamResponse(
                fullText
            );

        const suggestedMovies =
            this.buildSuggestedMovies(
                aiResponse.movie_ids,
                context.movies
            );

        console.log(
            `🚀 [AI Stream] TOTAL: ` +
            `${Date.now() - totalStartedAt}ms`
        );

        /* ----------------------------------------------------
           DONE
        ---------------------------------------------------- */

        yield {
            type: 'done',

            movies:
                suggestedMovies
        };
    }
}

/* ============================================================
   EXPORT
============================================================ */

module.exports = new AiService();
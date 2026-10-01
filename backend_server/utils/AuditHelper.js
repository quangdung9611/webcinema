// Utils/AuditHelper.js
const db = require("../Config/db");

/* ==========================================================
   RESOURCE MAP — từ URL resource → DB table + primary key
========================================================== */

const RESOURCE_MAP = {
    // Phim
    movies: { table: "movies", pk: "movie_id" },
    "movie-genres": { table: "movie_genres", pk: "movie_genre_id" },
    "movie-actors": { table: "movie_actors", pk: "movie_actor_id" },
    genres: { table: "genres", pk: "genre_id" },
    
    // Rạp & phòng
    cinemas: { table: "cinemas", pk: "cinema_id" },
    rooms: { table: "rooms", pk: "room_id" },
    seats: { table: "seats", pk: "seat_id" },
    
    // Suất chiếu
    showtimes: { table: "showtimes", pk: "showtime_id" },
    "showtime-config": { table: "movie_showtime_config", pk: "config_id" },
    "price-config": { table: "price_config", pk: "price_config_id" },
    
    // Nội dung
    news: { table: "news", pk: "news_id" },
    "blog-cinema": { table: "blog_cinema", pk: "blog_id" },
    promotions: { table: "promotions", pk: "promotion_id" },
    banners: { table: "banners", pk: "banner_id" },
    actors: { table: "actors", pk: "actor_id" },
    
    // User & giao dịch
    users: { table: "users", pk: "user_id" },
    bookings: { table: "bookings", pk: "booking_id" },
    tickets: { table: "tickets", pk: "ticket_id" },
    coupons: { table: "coupons", pk: "coupon_id" },
    
    // Đồ ăn
    foods: { table: "product_menu", pk: "product_id" },
};

/* ==========================================================
   SENSITIVE FIELDS — cần mask khi lưu log
========================================================== */

const SENSITIVE_FIELDS = [
    "password", "newpassword", "oldpassword", "confirmpassword",
    "pin", "pin_hash", "pinhash",
    "otp", "token", "accesstoken", "refreshtoken", "socket_token",
    "secret", "apikey", "secretkey",
];

/* ==========================================================
   PARSE URL → { resource, resource_id }
========================================================== */

const parseResource = (url) => {
    if (!url) return { resource: null, resource_id: null };

    const clean = url.split("?")[0];
    const parts = clean.split("/").filter(Boolean);
    const apiIdx = parts.indexOf("api");

    if (apiIdx === -1 || apiIdx + 1 >= parts.length) {
        return { resource: null, resource_id: null };
    }

    const resource = parts[apiIdx + 1];
    const idPart = parts[apiIdx + 2];
    const resource_id = idPart && /^\d+$/.test(idPart) ? idPart : null;

    return { resource, resource_id };
};

/* ==========================================================
   MASK SENSITIVE — che password/token
========================================================== */

const maskSensitive = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
        return obj.map(maskSensitive);
    }

    // Date / Buffer → không đụng
    if (obj instanceof Date || Buffer.isBuffer(obj)) {
        return obj;
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = String(key).toLowerCase();

        if (SENSITIVE_FIELDS.some((f) => lowerKey.includes(f))) {
            result[key] = "***MASKED***";
        } else if (value && typeof value === "object") {
            result[key] = maskSensitive(value);
        } else {
            result[key] = value;
        }
    }
    return result;
};

/* ==========================================================
   FETCH OLD DATA — lấy record hiện tại từ DB
========================================================== */

const fetchOldData = async (resource, resourceId) => {
    if (!resource || !resourceId) return null;

    const map = RESOURCE_MAP[resource];
    if (!map) return null;

    try {
        const [rows] = await db.query(
            `SELECT * FROM \`${map.table}\` WHERE \`${map.pk}\` = ? LIMIT 1`,
            [resourceId]
        );

        if (!rows[0]) return null;

        // Mask sensitive trước khi trả về
        return maskSensitive(rows[0]);
    } catch (err) {
        // Không throw — audit log không nên phá vỡ flow chính
        console.error(`❌ [AUDIT] fetchOldData error (${resource}/${resourceId}):`, err.message);
        return null;
    }
};

/* ==========================================================
   CALCULATE CHANGES — diff old vs new
========================================================== */

const calculateChanges = (oldData, newData) => {
    if (!oldData || !newData) return null;

    const changes = {};

    for (const key of Object.keys(newData)) {
        const oldVal = oldData[key];
        const newVal = newData[key];

        // So sánh string-safe
        const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
        const newStr = newVal === null || newVal === undefined ? "" : String(newVal);

        if (oldStr !== newStr) {
            changes[key] = {
                old: oldVal ?? null,
                new: newVal ?? null,
            };
        }
    }

    return Object.keys(changes).length > 0 ? changes : null;
};

/* ==========================================================
   METHOD → ACTION
========================================================== */

const methodToAction = (method) => {
    const m = String(method || "").toUpperCase();
    if (m === "POST") return "CREATE";
    if (m === "PUT" || m === "PATCH") return "UPDATE";
    if (m === "DELETE") return "DELETE";
    return m;
};

/* ==========================================================
   EXPORT
========================================================== */

module.exports = {
    RESOURCE_MAP,
    SENSITIVE_FIELDS,
    parseResource,
    maskSensitive,
    fetchOldData,
    calculateChanges,
    methodToAction,
};
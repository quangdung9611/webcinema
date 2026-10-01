// Middlewares/SanitizeMiddleware.js
const xss = require("xss");
const sanitizeHtml = require("sanitize-html");

/* ==========================================================
   INPUT SANITIZATION MIDDLEWARE
   ----------------------------------------------------------
   ✅ Chống XSS: lọc <script>, onerror, javascript:...
   ✅ Chống NoSQL Injection: xoá $, . trong key
   ✅ Whitelist HTML cho field rich-text (blog, news, promotion)
   ✅ Bỏ qua multipart/form-data (upload file)
========================================================== */

/* ==========================================================
   DANH SÁCH FIELD CHO PHÉP GIỮ HTML (rich-text)
========================================================== */

const RICH_TEXT_FIELDS = [
    "content",
    "description",
    "biography",
    "body",
    "full_description",
];

/* ==========================================================
   CẤU HÌNH SANITIZE-HTML CHO RICH TEXT
========================================================== */

const RICH_TEXT_OPTIONS = {
    allowedTags: [
        "p", "br", "strong", "b", "em", "i", "u", "s",
        "span", "div",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "a", "img",
        "blockquote", "pre", "code",
        "table", "thead", "tbody", "tr", "th", "td",
        "hr",
    ],

    allowedAttributes: {
        a: ["href", "title", "target", "rel"],
        img: ["src", "alt", "title", "width", "height", "loading"],
        span: ["style"],
        div: ["style"],
        p: ["style"],
        h1: ["style"],
        h2: ["style"],
        h3: ["style"],
        h4: ["style"],
        h5: ["style"],
        h6: ["style"],
        table: ["style"],
        th: ["colspan", "rowspan"],
        td: ["colspan", "rowspan"],
    },

    allowedSchemes: ["http", "https", "data"],
    allowedSchemesByTag: {
        img: ["http", "https", "data"],
        a: ["http", "https", "mailto", "tel"],
    },

    transformTags: {
        a: (tagName, attribs) => {
            const newAttribs = {
                ...attribs,
                rel: "noopener noreferrer",
            };

            // Chỉ giữ href hợp lệ
            const href = attribs.href || "";
            if (
                !href.startsWith("http") &&
                !href.startsWith("/") &&
                !href.startsWith("mailto") &&
                !href.startsWith("tel")
            ) {
                delete newAttribs.href;
            }

            return {
                tagName: "a",
                attribs: newAttribs,
            };
        },
    },

    disallowedTagsMode: "discard",
};

/* ==========================================================
   XSS OPTIONS (cho string thường)
========================================================== */

const XSS_OPTIONS = {
    whiteList: {}, // Không cho phép thẻ nào
    stripIgnoreTag: true, // Xoá hết thẻ
    stripIgnoreTagBody: ["script", "style"], // Xoá cả nội dung
};

/* ==========================================================
   HELPER
========================================================== */

const isPlainObject = (val) =>
    val !== null &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    !(val instanceof Date) &&
    !Buffer.isBuffer(val);

/* ==========================================================
   SANITIZE 1 GIÁ TRỊ
========================================================== */

const sanitizeValue = (key, value) => {
    // Null / undefined → giữ
    if (value === null || value === undefined) return value;

    // Number / Boolean → giữ
    if (typeof value === "number" || typeof value === "boolean") {
        return value;
    }

    // Date → giữ
    if (value instanceof Date) return value;

    // Array → đệ quy
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(key, item));
    }

    // Object → đệ quy
    if (isPlainObject(value)) {
        return sanitizeObject(value);
    }

    // String → xử lý
    if (typeof value === "string") {
        // Rich text → giữ thẻ HTML an toàn
        if (RICH_TEXT_FIELDS.includes(key)) {
            return sanitizeHtml(value, RICH_TEXT_OPTIONS);
        }

        // String thường → strip hết thẻ
        return xss(value, XSS_OPTIONS);
    }

    return value;
};

/* ==========================================================
   SANITIZE OBJECT (đệ quy)
========================================================== */

const sanitizeObject = (obj) => {
    if (!isPlainObject(obj)) return obj;

    const result = {};

    for (const key of Object.keys(obj)) {
        // 🚫 Chặn NoSQL injection: key bắt đầu bằng $ hoặc có dấu .
        if (key.startsWith("$") || key.includes(".")) {
            console.warn(
                `🚫 [Sanitize] Blocked suspicious key: ${key}`
            );
            continue;
        }

        result[key] = sanitizeValue(key, obj[key]);
    }

    return result;
};

/* ==========================================================
   MIDDLEWARE CHÍNH
========================================================== */

const sanitizeMiddleware = (req, res, next) => {
    try {
        const contentType = req.headers["content-type"] || "";

        // Với multipart/form-data: chỉ sanitize text field
        // (không đụng file upload)
        if (contentType.includes("multipart/form-data")) {
            if (req.body && typeof req.body === "object") {
                req.body = sanitizeObject(req.body);
            }
        } else {
            // JSON / urlencoded → sanitize hết
            if (req.body) req.body = sanitizeObject(req.body);
        }

        // Sanitize query params
        if (req.query) req.query = sanitizeObject(req.query);

        // Sanitize route params
        if (req.params) req.params = sanitizeObject(req.params);

        next();
    } catch (err) {
        console.error("🔴 [Sanitize] Error:", err);
        return res.status(400).json({
            success: false,
            message: "Dữ liệu đầu vào không hợp lệ.",
        });
    }
};

/* ==========================================================
   EXPORT
========================================================== */

module.exports = {
    sanitizeMiddleware,
    sanitizeValue,
    sanitizeObject,
};
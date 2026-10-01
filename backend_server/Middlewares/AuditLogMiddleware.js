// Middlewares/AuditLogMiddleware.js
const AuditLogService = require("../Services/AuditLogService");
const { fetchOldData, parseResource } = require("../utils/AuditHelper");

/* ==========================================================
   AUDIT LOG MIDDLEWARE — ADVANCED
   ----------------------------------------------------------
   ✅ Fetch OLD data từ DB TRƯỚC khi handler chạy (cho PUT/PATCH/DELETE)
   ✅ Hook vào "finish" event → ghi log SAU khi response gửi
   ✅ Tính diff old vs new
   ✅ Fire-and-forget, không block response
========================================================== */

const auditLogMiddleware = async (req, res, next) => {
    const startTime = Date.now();
    const method = String(req.method || "").toUpperCase();

    // Chỉ log các method thay đổi data
    const METHOD_TO_LOG = ["POST", "PUT", "PATCH", "DELETE"];
    if (!METHOD_TO_LOG.includes(method)) {
        return next();
    }

    // Skip một số route
    const url = req.originalUrl || req.url || "";
    if (AuditLogService.shouldSkip(url)) {
        return next();
    }

    // ✅ FETCH OLD DATA TRƯỚC (cho PUT/PATCH/DELETE)
    let oldData = null;

    if (method === "PUT" || method === "PATCH" || method === "DELETE") {
        try {
            // Chờ middleware auth đã set req.user chưa
            const { resource, resource_id } = parseResource(url);

            if (resource && resource_id) {
                oldData = await fetchOldData(resource, resource_id);
            }
        } catch (err) {
            console.error("❌ [AUDIT MW] fetchOldData error:", err.message);
            oldData = null;
        }
    }

    // ✅ HOOK VÀO FINISH EVENT
    res.on("finish", () => {
        const responseTimeMs = Date.now() - startTime;

        // Không log nếu chưa auth
        if (!req.user || !req.user.user_id) {
            return;
        }

        try {
            // Build log data (async vì buildLogData có thể có await)
            AuditLogService.buildLogData(req, res, responseTimeMs, oldData)
                .then((logData) => {
                    if (logData) {
                        AuditLogService.log(logData);
                    }
                })
                .catch((err) => {
                    console.error("❌ [AUDIT MW] buildLogData error:", err.message);
                });
        } catch (err) {
            console.error("❌ [AUDIT MW] Sync error:", err.message);
        }
    });

    next();
};

module.exports = { auditLogMiddleware };
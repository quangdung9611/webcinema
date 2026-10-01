// Services/AuditLogService.js
const AuditLogRepository = require("../Repositories/AuditLogRepository");
const {
    parseResource,
    maskSensitive,
    fetchOldData,
    calculateChanges,
    methodToAction,
} = require("../utils/AuditHelper");

/* ==========================================================
   SKIP PATTERNS — không log những route này
========================================================== */
const SKIP_PATTERNS = [
    "/admin/api/auth/login",
    "/admin/api/auth/logout",
    "/admin/api/auth/refresh-token",
    "/admin/api/auth/refresh",
    "/admin/api/audit-logs", // không log việc xem log
];

class AuditLogService {

    /*=========================================================
        GHI LOG — fire-and-forget
    =========================================================*/
    async log(data) {
        try {
            await AuditLogRepository.create(data);
        } catch (err) {
            console.error("❌ [AUDIT] Save log failed:", err.message);
        }
    }

    /*=========================================================
        BUILD LOG DATA
    =========================================================*/
    async buildLogData(req, res, responseTimeMs, oldData = null) {
        const user = req.user || {};
        const url = req.originalUrl || req.url || "";
        const { resource, resource_id } = parseResource(url);

        const status = res.statusCode;
        const isSuccess = status >= 200 && status < 300;

        const maskedBody = maskSensitive(req.body);
        const maskedParams = maskSensitive(req.params);
        const maskedQuery = maskSensitive(req.query);

        // Tính diff CHỈ với UPDATE
        let changes = null;
        if (req.method === "PUT" || req.method === "PATCH") {
            changes = calculateChanges(oldData, maskedBody);
        }

        return {
            admin_id: user.user_id || null,
            admin_email: user.email || null,
            admin_username: user.username || null,

            action: methodToAction(req.method),
            method: req.method,
            endpoint: url,
            route_pattern: req.route?.path || null,

            resource,
            resource_id,

            old_data: oldData,
            new_data: req.method === "DELETE" ? null : maskedBody,
            changes,

            request_body: maskedBody,
            request_params: maskedParams,
            request_query: maskedQuery,

            response_status: status,
            response_time_ms: Math.round(responseTimeMs),
            is_success: isSuccess ? 1 : 0,

            ip_address: req.ip || req.connection?.remoteAddress || null,
            user_agent: req.headers["user-agent"] || null,
        };
    }

    /*=========================================================
        CHECK SKIP
    =========================================================*/
    shouldSkip(url) {
        return SKIP_PATTERNS.some((p) => url.includes(p));
    }

    /*=========================================================
        API
    =========================================================*/
    async getLogs(filters) {
        return await AuditLogRepository.findAll(filters);
    }

    async getLogById(id) {
        const log = await AuditLogRepository.findById(id);
        if (!log) {
            const err = new Error("Không tìm thấy log");
            err.statusCode = 404;
            throw err;
        }
        return log;
    }

    async getStats(days) {
        return await AuditLogRepository.getStats(days);
    }

    async cleanupOld(days = 90) {
        return await AuditLogRepository.cleanupOld(days);
    }
}

// Export các helper để middleware dùng
module.exports = new AuditLogService();
module.exports.parseResource = parseResource;
module.exports.fetchOldData = fetchOldData;
module.exports.maskSensitive = maskSensitive;
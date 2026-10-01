// Repositories/AuditLogRepository.js
const db = require("../Config/db");

class AuditLogRepository {

    /*=========================================================
        CREATE LOG
    =========================================================*/
    async create(data) {
        const {
            admin_id = null,
            admin_email = null,
            admin_username = null,
            action,
            method,
            endpoint,
            route_pattern = null,
            resource = null,
            resource_id = null,
            old_data = null,
            new_data = null,
            changes = null,
            request_body = null,
            request_params = null,
            request_query = null,
            response_status = null,
            response_time_ms = null,
            is_success = null,
            ip_address = null,
            user_agent = null,
        } = data;

        const toJson = (val) => (val && typeof val === "object" ? JSON.stringify(val) : null);

        const [result] = await db.query(
            `
            INSERT INTO audit_logs (
                admin_id, admin_email, admin_username,
                action, method, endpoint, route_pattern,
                resource, resource_id,
                old_data, new_data, changes,
                request_body, request_params, request_query,
                response_status, response_time_ms, is_success,
                ip_address, user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                admin_id, admin_email, admin_username,
                action, method, endpoint, route_pattern,
                resource, resource_id,
                toJson(old_data), toJson(new_data), toJson(changes),
                toJson(request_body), toJson(request_params), toJson(request_query),
                response_status, response_time_ms, is_success,
                ip_address, user_agent,
            ]
        );

        return result.insertId;
    }

    /*=========================================================
        FIND ALL — filter + phân trang
    =========================================================*/
    async findAll({
        page = 1,
        limit = 20,
        admin_id = null,
        action = null,
        resource = null,
        is_success = null,
        from = null,
        to = null,
        search = "",
    }) {
        page = Math.max(1, parseInt(page, 10) || 1);
        limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        const conditions = [];
        const params = [];

        if (admin_id) {
            conditions.push("admin_id = ?");
            params.push(admin_id);
        }
        if (action) {
            conditions.push("action = ?");
            params.push(action);
        }
        if (resource) {
            conditions.push("resource = ?");
            params.push(resource);
        }
        if (is_success !== null && is_success !== undefined && is_success !== "") {
            conditions.push("is_success = ?");
            params.push(Number(is_success) ? 1 : 0);
        }
        if (from) {
            conditions.push("DATE(created_at) >= ?");
            params.push(from);
        }
        if (to) {
            conditions.push("DATE(created_at) <= ?");
            params.push(to);
        }
        if (search && typeof search === "string") {
            const keyword = `%${search.trim()}%`;
            conditions.push(
                "(admin_email LIKE ? OR admin_username LIKE ? OR endpoint LIKE ? OR resource_id LIKE ?)"
            );
            params.push(keyword, keyword, keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                audit_id, admin_id, admin_email, admin_username,
                action, method, endpoint,
                resource, resource_id,
                old_data, new_data, changes,
                request_body,
                response_status, response_time_ms, is_success,
                ip_address,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') AS created_at
            FROM audit_logs
            ${whereClause}
            ORDER BY audit_id DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        // Parse JSON
        const parsed = rows.map((row) => ({
            ...row,
            old_data: row.old_data ? safeParse(row.old_data) : null,
            new_data: row.new_data ? safeParse(row.new_data) : null,
            changes: row.changes ? safeParse(row.changes) : null,
            request_body: row.request_body ? safeParse(row.request_body) : null,
        }));

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`,
            params
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: parsed,
            pagination: {
                page, limit, total, totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages,
            },
        };
    }

    /*=========================================================
        FIND BY ID
    =========================================================*/
    async findById(auditId) {
        const [rows] = await db.query(
            `SELECT * FROM audit_logs WHERE audit_id = ? LIMIT 1`,
            [auditId]
        );

        if (!rows[0]) return null;

        return {
            ...rows[0],
            old_data: rows[0].old_data ? safeParse(rows[0].old_data) : null,
            new_data: rows[0].new_data ? safeParse(rows[0].new_data) : null,
            changes: rows[0].changes ? safeParse(rows[0].changes) : null,
            request_body: rows[0].request_body ? safeParse(rows[0].request_body) : null,
            request_params: rows[0].request_params ? safeParse(rows[0].request_params) : null,
            request_query: rows[0].request_query ? safeParse(rows[0].request_query) : null,
        };
    }

    /*=========================================================
        STATS
    =========================================================*/
    async getStats(days = 7) {
        const [rows] = await db.query(
            `
            SELECT
                action,
                COUNT(*) AS total,
                SUM(is_success) AS success_count,
                SUM(NOT is_success) AS fail_count
            FROM audit_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY action
            ORDER BY total DESC
            `,
            [days]
        );
        return rows;
    }

    /*=========================================================
        CLEANUP
    =========================================================*/
    async cleanupOld(days = 90) {
        const [result] = await db.query(
            `DELETE FROM audit_logs 
             WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );
        return result.affectedRows;
    }
}

/* ==========================================================
   HELPER: safe parse JSON
========================================================== */
function safeParse(str) {
    if (typeof str !== "string") return str;
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

module.exports = new AuditLogRepository();
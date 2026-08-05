const db = require("../Config/db");

class BannerRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG (DÙNG CHUNG)
        🔥 Đã thêm tham số page để nhận 'HOME', 'PROMOTION',...
    ========================================================== */
    async findAllAll(search = "", page = "") {
        search = typeof search === "string" ? search.trim() : "";
        page = typeof page === "string" ? page.trim() : "";

        const conditions = [];
        const queryParams = [];

        // 1. Điều kiện tìm kiếm (page LIKE hoặc image_url LIKE)
        if (search) {
            conditions.push("(page LIKE ? OR image_url LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        // 2. Điều kiện lọc theo trang (page = 'HOME', 'PROMOTION', ...)
        if (page) {
            conditions.push("page = ?");
            queryParams.push(page);
        }

        // Ghép câu WHERE
        const whereClause = conditions.length > 0 
            ? "WHERE " + conditions.join(" AND ") 
            : "";

        const [rows] = await db.query(
            `
            SELECT
                banner_id,
                page,
                image_url,
                is_active,
                created_at,
                updated_at
            FROM banners
            ${whereClause}
            ORDER BY created_at DESC
            `,
            queryParams
        );

        // Giữ nguyên cấu trúc pagination giả lập cho frontend
        return {
            data: rows,
            pagination: {
                page: 1,
                limit: rows.length,
                total: rows.length,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            }
        };
    }

    /* ==========================================================
        FIND ALL - CÓ PHÂN TRANG (ADMIN)
    ========================================================== */
    async findAll(onlyActive = false, page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE (page LIKE ? OR image_url LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        if (onlyActive) {
            if (whereClause) {
                whereClause += ` AND is_active = 1`;
            } else {
                whereClause = `WHERE is_active = 1`;
            }
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                banner_id,
                page,
                image_url,
                is_active,
                created_at,
                updated_at
            FROM banners
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        let countSql = `SELECT COUNT(*) AS total FROM banners`;
        const countParams = [...queryParams];

        if (onlyActive) {
            if (whereClause.includes('AND')) {
                countSql += ` WHERE is_active = 1`;
            } else {
                countSql += ` WHERE is_active = 1`;
            }
        }

        if (search) {
            if (!onlyActive) {
                countSql += ` WHERE (page LIKE ? OR image_url LIKE ?)`;
            } else {
                countSql += ` AND (page LIKE ? OR image_url LIKE ?)`;
            }
            if (countParams.length === 0) {
                const keyword = `%${search}%`;
                countParams.push(keyword, keyword);
            }
        }

        const [countRows] = await db.query(countSql, countParams);
        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /* ==========================================================
        FIND BANNER BY ID
    ========================================================== */
    async findById(bannerId) {
        const [rows] = await db.query(
            `SELECT * FROM banners WHERE banner_id = ? LIMIT 1`,
            [bannerId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE BANNER
    ========================================================== */
    async create(data) {
        const [result] = await db.query(
            `
            INSERT INTO banners (page, image_url, is_active)
            VALUES (?, ?, ?)
            `,
            [data.page, data.image_url, data.is_active !== undefined ? data.is_active : 1]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE BANNER
    ========================================================== */
    async update(bannerId, data) {
        const fields = [];
        const values = [];
        if (data.page !== undefined) { fields.push("page = ?"); values.push(data.page); }
        if (data.image_url !== undefined) { fields.push("image_url = ?"); values.push(data.image_url); }
        if (data.is_active !== undefined) { fields.push("is_active = ?"); values.push(data.is_active); }
        if (fields.length === 0) return 0;

        values.push(bannerId);
        const query = `
            UPDATE banners
            SET ${fields.join(", ")}, updated_at = NOW()
            WHERE banner_id = ?
        `;
        const [result] = await db.query(query, values);
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE BANNER
    ========================================================== */
    async delete(bannerId) {
        const [result] = await db.query(`DELETE FROM banners WHERE banner_id = ?`, [bannerId]);
        return result.affectedRows;
    }
}

module.exports = new BannerRepository();
const db = require("../Config/db");

class PromotionRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG (DÙNG CHUNG)
    ========================================================== */
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE (title LIKE ? OR description LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const [rows] = await db.query(
            `
            SELECT
                promotion_id,
                title,
                slug,
                description,
                promotion_image,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM promotions
            ${whereClause}
            ORDER BY created_at DESC
            `,
            queryParams
        );

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
            whereClause = `WHERE (title LIKE ? OR description LIKE ?)`;
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
                promotion_id,
                title,
                slug,
                description,
                promotion_image,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM promotions
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        let countSql = `SELECT COUNT(*) AS total FROM promotions`;
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
                countSql += ` WHERE (title LIKE ? OR description LIKE ?)`;
            } else {
                countSql += ` AND (title LIKE ? OR description LIKE ?)`;
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
        GET BY ID
    ========================================================== */
    async findById(promotionId) {
        const [rows] = await db.query(
            `SELECT * FROM promotions WHERE promotion_id = ? LIMIT 1`,
            [promotionId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        GET BY SLUG
    ========================================================== */
    async findBySlug(slug) {
        const [rows] = await db.query(
            `SELECT * FROM promotions WHERE slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE
    ========================================================== */
    async findByTitleOrSlug(title, slug, excludePromotionId = null) {
        let sql = `SELECT promotion_id FROM promotions WHERE (title = ? OR slug = ?)`;
        const params = [title.trim(), slug];
        if (excludePromotionId) {
            sql += ` AND promotion_id != ?`;
            params.push(excludePromotionId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE
    ========================================================== */
    async create(data) {
        const { title, slug, description, promotion_image, likes, is_active } = data;
        const [result] = await db.query(
            `
            INSERT INTO promotions
            (title, slug, description, promotion_image, likes, views, is_active)
            VALUES (?, ?, ?, ?, ?, 0, ?)
            `,
            [title.trim(), slug, description, promotion_image || null, parseInt(likes, 10) || 0, is_active]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE
    ========================================================== */
    async update(promotionId, data) {
        const { title, slug, description, promotion_image, likes, is_active } = data;
        const [result] = await db.query(
            `
            UPDATE promotions
            SET title = ?, slug = ?, description = ?, promotion_image = ?, likes = ?, is_active = ?
            WHERE promotion_id = ?
            `,
            [title.trim(), slug, description, promotion_image || null, parseInt(likes, 10) || 0, is_active, promotionId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE
    ========================================================== */
    async delete(promotionId) {
        const [result] = await db.query(`DELETE FROM promotions WHERE promotion_id = ?`, [promotionId]);
        return result.affectedRows;
    }

    /* ==========================================================
        IMAGE
    ========================================================== */
    async getImage(promotionId) {
        const [rows] = await db.query(`SELECT promotion_image FROM promotions WHERE promotion_id = ?`, [promotionId]);
        return rows[0] || null;
    }

    /* ==========================================================
        LIKE
    ========================================================== */
    async incrementLikes(promotionId) {
        const [result] = await db.query(`UPDATE promotions SET likes = likes + 1 WHERE promotion_id = ?`, [promotionId]);
        return result.affectedRows;
    }

    /* ==========================================================
        VIEW
    ========================================================== */
    async incrementViews(promotionId) {
        const [result] = await db.query(`UPDATE promotions SET views = views + 1 WHERE promotion_id = ?`, [promotionId]);
        return result.affectedRows;
    }

    /* ==========================================================
        TOGGLE STATUS
    ========================================================== */
    async toggleStatus(promotionId) {
        const [rows] = await db.query(`SELECT is_active FROM promotions WHERE promotion_id = ?`, [promotionId]);
        if (rows.length === 0) return null;
        const newStatus = rows[0].is_active ? 0 : 1;
        await db.query(`UPDATE promotions SET is_active = ? WHERE promotion_id = ?`, [newStatus, promotionId]);
        return newStatus;
    }

    /* ==========================================================
        TRANSACTION
    ========================================================== */
    async getConnection() {
        return await db.getConnection();
    }
    async beginTransaction(connection) {
        await connection.beginTransaction();
    }
    async commit(connection) {
        await connection.commit();
    }
    async rollback(connection) {
        await connection.rollback();
    }
}

module.exports = new PromotionRepository();
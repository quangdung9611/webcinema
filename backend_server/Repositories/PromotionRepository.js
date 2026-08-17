const db = require('../Config/db');

class PromotionRepository {

    /*=========================================================
        FIND ALL PROMOTIONS - KHÔNG PHÂN TRANG
        RETURN: rows[] (trực tiếp, không bọc)
    =========================================================*/
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push("(title LIKE ? OR description LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(
            `
            SELECT
                promotion_id,
                title,
                slug,
                description,
                promotion_image,
                promotion_backdrop,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM promotions
            ${whereClause}
            ORDER BY promotion_id DESC
            `,
            queryParams
        );

        return rows;
    }

    /*=========================================================
        FIND ALL PROMOTIONS - CÓ PHÂN TRANG
        RETURN: { data: [], pagination: {} }
    =========================================================*/
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push("(title LIKE ? OR description LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                promotion_id,
                title,
                slug,
                description,
                promotion_image,
                promotion_backdrop,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM promotions
            ${whereClause}
            ORDER BY promotion_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM promotions
            ${whereClause}
            `,
            queryParams
        );

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

    /*=========================================================
        FIND PROMOTION BY ID
    =========================================================*/
    async findById(promotionId) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM promotions
            WHERE promotion_id = ?
            LIMIT 1
            `,
            [promotionId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        FIND PROMOTION BY SLUG
    =========================================================*/
    async findBySlug(slug) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM promotions
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CHECK EXISTS BY TITLE OR SLUG
    =========================================================*/
    async existsByTitleOrSlug(title, slug, excludeId = null) {
        let sql = `
            SELECT promotion_id
            FROM promotions
            WHERE title = ? OR slug = ?
        `;
        const params = [title, slug];

        if (excludeId != null) {
            sql += ` AND promotion_id != ?`;
            params.push(Number(excludeId));
        }
        sql += ` LIMIT 1`;

        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /*=========================================================
        CREATE PROMOTION
    =========================================================*/
    async create(promotionData) {
        const {
            title,
            slug,
            description,
            promotion_image,
            promotion_backdrop,
            likes,
            is_active
        } = promotionData;

        const [result] = await db.query(
            `
            INSERT INTO promotions (
                title, slug, description, promotion_image, promotion_backdrop,
                likes, views, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            `,
            [
                title,
                slug,
                description || "",
                promotion_image || null,
                promotion_backdrop || null,
                likes || 0,
                is_active || 1
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE PROMOTION
    =========================================================*/
    async update(promotionId, promotionData) {
        const {
            title,
            slug,
            description,
            promotion_image,
            promotion_backdrop,
            likes,
            is_active
        } = promotionData;

        const [result] = await db.query(
            `
            UPDATE promotions
            SET
                title = ?,
                slug = ?,
                description = ?,
                promotion_image = ?,
                promotion_backdrop = ?,
                likes = ?,
                is_active = ?
            WHERE promotion_id = ?
            `,
            [
                title,
                slug,
                description || "",
                promotion_image,
                promotion_backdrop,
                likes || 0,
                is_active,
                promotionId
            ]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE PROMOTION
    =========================================================*/
    async delete(promotionId) {
        const [result] = await db.query(
            `DELETE FROM promotions WHERE promotion_id = ?`,
            [promotionId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        INCREMENT LIKES
    =========================================================*/
    async incrementLikes(promotionId) {
        const [result] = await db.query(
            `UPDATE promotions SET likes = likes + 1 WHERE promotion_id = ?`,
            [promotionId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        INCREMENT VIEWS
    =========================================================*/
    async incrementViews(promotionId) {
        const [result] = await db.query(
            `UPDATE promotions SET views = views + 1 WHERE promotion_id = ?`,
            [promotionId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        TOGGLE STATUS
    =========================================================*/
    async toggleStatus(promotionId) {
        const [rows] = await db.query(
            `
            SELECT is_active
            FROM promotions
            WHERE promotion_id = ?
            `,
            [promotionId]
        );

        if (rows.length === 0) {
            return null;
        }

        const newStatus = rows[0].is_active === 1 ? 0 : 1;

        await db.query(
            `
            UPDATE promotions
            SET is_active = ?
            WHERE promotion_id = ?
            `,
            [newStatus, promotionId]
        );

        return newStatus;
    }
}

module.exports = new PromotionRepository();
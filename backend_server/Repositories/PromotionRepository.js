
const db = require("../Config/db");

class PromotionRepository {

    /* ==========================================================
        FIND ALL PROMOTIONS - KHÔNG PHÂN TRANG
        PUBLIC / ADMIN
    ========================================================== */
    async findAllAll(search = "") {

        search = typeof search === "string"
            ? search.trim()
            : "";

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push(`
                (
                    title LIKE ?
                    OR description LIKE ?
                )
            `);

            const keyword = `%${search}%`;

            params.push(
                keyword,
                keyword
            );
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

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
                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y %H:%i'
                ) AS full_date
            FROM promotions

            ${whereClause}

            ORDER BY
                created_at DESC,
                promotion_id DESC
            `,
            params
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
        FIND ALL PROMOTIONS - CÓ PHÂN TRANG
        ADMIN
    ========================================================== */
    async findAll(
        onlyActive = false,
        page = 1,
        limit = 20,
        search = ""
    ) {

        /* ------------------------------------------------------
            NORMALIZE PAGINATION
        ------------------------------------------------------ */
        page = Number.parseInt(page, 10);

        limit = Number.parseInt(limit, 10);

        if (!Number.isFinite(page) || page < 1) {
            page = 1;
        }

        if (!Number.isFinite(limit) || limit < 1) {
            limit = 20;
        }

        if (limit > 100) {
            limit = 100;
        }


        /* ------------------------------------------------------
            NORMALIZE SEARCH
        ------------------------------------------------------ */
        search = typeof search === "string"
            ? search.trim()
            : "";


        /* ------------------------------------------------------
            BUILD WHERE
        ------------------------------------------------------ */
        const conditions = [];
        const params = [];

        if (search) {

            conditions.push(`
                (
                    title LIKE ?
                    OR description LIKE ?
                )
            `);

            const keyword = `%${search}%`;

            params.push(
                keyword,
                keyword
            );
        }


        /* ------------------------------------------------------
            ONLY ACTIVE
        ------------------------------------------------------ */
        if (onlyActive) {

            conditions.push(`
                is_active = 1
            `);
        }


        /* ------------------------------------------------------
            WHERE CLAUSE
        ------------------------------------------------------ */
        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";


        /* ------------------------------------------------------
            OFFSET
        ------------------------------------------------------ */
        const offset = (page - 1) * limit;


        /* ======================================================
            GET DATA
        ====================================================== */
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
                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y %H:%i'
                ) AS full_date
            FROM promotions

            ${whereClause}

            ORDER BY
                created_at DESC,
                promotion_id DESC

            LIMIT ?
            OFFSET ?
            `,
            [
                ...params,
                limit,
                offset
            ]
        );


        /* ======================================================
            COUNT TOTAL
        ====================================================== */
        const [countRows] = await db.query(
            `
            SELECT
                COUNT(*) AS total
            FROM promotions

            ${whereClause}
            `,
            params
        );


        /* ------------------------------------------------------
            PAGINATION INFO
        ------------------------------------------------------ */
        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages = Math.ceil(
            total / limit
        ) || 1;


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
        FIND PROMOTION BY ID
    ========================================================== */
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


    /* ==========================================================
        FIND PROMOTION BY SLUG
    ========================================================== */
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


    /* ==========================================================
        CHECK DUPLICATE TITLE / SLUG
    ========================================================== */
    async findByTitleOrSlug(
        title,
        slug,
        excludePromotionId = null
    ) {

        let sql = `
            SELECT promotion_id
            FROM promotions
            WHERE (
                title = ?
                OR slug = ?
            )
        `;

        const params = [
            title.trim(),
            slug
        ];


        if (
            excludePromotionId !== null &&
            excludePromotionId !== undefined
        ) {

            sql += `
                AND promotion_id != ?
            `;

            params.push(
                Number(excludePromotionId)
            );
        }


        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    /* ==========================================================
        CREATE PROMOTION
    ========================================================== */
    async create(data) {

        const {
            title,
            slug,
            description,
            promotion_image,
            likes,
            is_active
        } = data;


        const [result] = await db.query(
            `
            INSERT INTO promotions
            (
                title,
                slug,
                description,
                promotion_image,
                likes,
                views,
                is_active
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                0,
                ?
            )
            `,
            [
                title.trim(),
                slug,
                description,
                promotion_image || null,
                Number.parseInt(likes, 10) || 0,
                is_active
            ]
        );

        return result.insertId;
    }


    /* ==========================================================
        UPDATE PROMOTION
    ========================================================== */
    async update(
        promotionId,
        data
    ) {

        const {
            title,
            slug,
            description,
            promotion_image,
            likes,
            is_active
        } = data;


        const [result] = await db.query(
            `
            UPDATE promotions

            SET
                title = ?,
                slug = ?,
                description = ?,
                promotion_image = ?,
                likes = ?,
                is_active = ?

            WHERE promotion_id = ?
            `,
            [
                title.trim(),
                slug,
                description,
                promotion_image || null,
                Number.parseInt(likes, 10) || 0,
                is_active,
                promotionId
            ]
        );

        return result.affectedRows;
    }


    /* ==========================================================
        DELETE PROMOTION
    ========================================================== */
    async delete(promotionId) {

        const [result] = await db.query(
            `
            DELETE FROM promotions
            WHERE promotion_id = ?
            `,
            [promotionId]
        );

        return result.affectedRows;
    }


    /* ==========================================================
        GET PROMOTION IMAGE
    ========================================================== */
    async getImage(promotionId) {

        const [rows] = await db.query(
            `
            SELECT
                promotion_image
            FROM promotions
            WHERE promotion_id = ?
            LIMIT 1
            `,
            [promotionId]
        );

        return rows[0] || null;
    }


    /* ==========================================================
        INCREMENT LIKES
    ========================================================== */
    async incrementLikes(promotionId) {

        const [result] = await db.query(
            `
            UPDATE promotions

            SET likes = likes + 1

            WHERE promotion_id = ?
            `,
            [promotionId]
        );

        return result.affectedRows;
    }


    /* ==========================================================
        INCREMENT VIEWS
    ========================================================== */
    async incrementViews(promotionId) {

        const [result] = await db.query(
            `
            UPDATE promotions

            SET views = views + 1

            WHERE promotion_id = ?
            `,
            [promotionId]
        );

        return result.affectedRows;
    }


    /* ==========================================================
        TOGGLE STATUS
    ========================================================== */
    async toggleStatus(promotionId) {

        const [rows] = await db.query(
            `
            SELECT
                is_active
            FROM promotions
            WHERE promotion_id = ?
            LIMIT 1
            `,
            [promotionId]
        );


        if (rows.length === 0) {
            return null;
        }


        const newStatus =
            Number(rows[0].is_active) === 1
                ? 0
                : 1;


        await db.query(
            `
            UPDATE promotions

            SET is_active = ?

            WHERE promotion_id = ?
            `,
            [
                newStatus,
                promotionId
            ]
        );


        return newStatus;
    }


    /* ==========================================================
        TRANSACTION - GET CONNECTION
    ========================================================== */
    async getConnection() {

        return await db.getConnection();
    }


    /* ==========================================================
        TRANSACTION - BEGIN
    ========================================================== */
    async beginTransaction(connection) {

        await connection.beginTransaction();
    }


    /* ==========================================================
        TRANSACTION - COMMIT
    ========================================================== */
    async commit(connection) {

        await connection.commit();
    }


    /* ==========================================================
        TRANSACTION - ROLLBACK
    ========================================================== */
    async rollback(connection) {

        await connection.rollback();
    }


    /* ==========================================================
        TRANSACTION - UPDATE
    ========================================================== */
    async updateWithConnection(
        connection,
        promotionId,
        data
    ) {

        const {
            title,
            slug,
            description,
            promotion_image,
            likes,
            is_active
        } = data;


        const [result] = await connection.query(
            `
            UPDATE promotions

            SET
                title = ?,
                slug = ?,
                description = ?,
                promotion_image = ?,
                likes = ?,
                is_active = ?

            WHERE promotion_id = ?
            `,
            [
                title.trim(),
                slug,
                description,
                promotion_image || null,
                Number.parseInt(likes, 10) || 0,
                is_active,
                promotionId
            ]
        );


        return result.affectedRows;
    }


    /* ==========================================================
        TRANSACTION - DELETE
    ========================================================== */
    async deleteWithConnection(
        connection,
        promotionId
    ) {

        const [result] = await connection.query(
            `
            DELETE FROM promotions
            WHERE promotion_id = ?
            `,
            [promotionId]
        );


        return result.affectedRows;
    }
}


module.exports = new PromotionRepository();


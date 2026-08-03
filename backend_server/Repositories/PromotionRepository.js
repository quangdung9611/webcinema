
const db = require("../Config/db");

class PromotionRepository {

    /* ==========================================================
       GET ALL - PAGINATION
       Mặc định: 20 promotion / trang
       Tối đa: 100 promotion / trang
    ========================================================== */

    async findAll(
        onlyActive = false,
        page = 1,
        limit = 20
    ) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }


        // ------------------------------------------------------
        // CHUẨN HÓA LIMIT
        // ------------------------------------------------------
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá 100 promotion / request
        if (limit > 100) {
            limit = 100;
        }


        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH PROMOTION
        // ======================================================
        let sql = `
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
                updated_at

            FROM promotions
        `;

        const params = [];

        if (onlyActive) {

            sql += `
                WHERE is_active = 1
            `;
        }


        sql += `
            ORDER BY created_at DESC

            LIMIT ? OFFSET ?
        `;


        params.push(
            limit,
            offset
        );


        const [rows] = await db.query(
            sql,
            params
        );


        // ======================================================
        // ĐẾM TỔNG PROMOTION
        // ======================================================
        let countSql = `
            SELECT COUNT(*) AS total
            FROM promotions
        `;

        const countParams = [];

        if (onlyActive) {

            countSql += `
                WHERE is_active = 1
            `;
        }


        const [countRows] = await db.query(
            countSql,
            countParams
        );


        const total = Number(
            countRows[0]?.total || 0
        );


        // ======================================================
        // TÍNH TỔNG SỐ TRANG
        // ======================================================
        const totalPages = Math.ceil(
            total / limit
        );


        // ======================================================
        // RETURN
        // ======================================================
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
       Không pagination
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
       GET BY SLUG
       Không pagination
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
       CHECK DUPLICATE
       Không pagination
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


        if (excludePromotionId) {

            sql += `
                AND promotion_id != ?
            `;

            params.push(
                excludePromotionId
            );
        }


        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    /* ==========================================================
       CREATE
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
                parseInt(likes, 10) || 0,
                is_active
            ]
        );


        return result.insertId;
    }


    /* ==========================================================
       UPDATE
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
                parseInt(likes, 10) || 0,
                is_active,
                promotionId
            ]
        );


        return result.affectedRows;
    }


    /* ==========================================================
       DELETE
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
       IMAGE
    ========================================================== */

    async getImage(promotionId) {

        const [rows] = await db.query(
            `
            SELECT promotion_image

            FROM promotions

            WHERE promotion_id = ?
            `,
            [promotionId]
        );


        return rows[0] || null;
    }


    /* ==========================================================
       LIKE
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
       VIEW
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
            SELECT is_active

            FROM promotions

            WHERE promotion_id = ?
            `,
            [promotionId]
        );


        if (rows.length === 0) {
            return null;
        }


        const newStatus = rows[0].is_active
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


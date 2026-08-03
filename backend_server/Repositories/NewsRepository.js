
const db = require("../Config/db");

class NewsRepository {

    // ==========================================================
    // GET ALL NEWS
    // PAGINATION
    // Mặc định: 20 news / trang
    // Tối đa: 100 news / trang
    // ==========================================================
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

        // Không cho lấy quá 100 news / request
        if (limit > 100) {
            limit = 100;
        }


        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH NEWS
        // ======================================================
        let sql = `
            SELECT
                news_id,
                title,
                slug,
                news_image,
                views,
                likes,

                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y'
                ) AS date,

                IF(
                    LENGTH(content) > 150,
                    CONCAT(
                        LEFT(content, 150),
                        '...'
                    ),
                    content
                ) AS short_content

            FROM news
        `;

        const params = [];


        /*
         * LƯU Ý:
         * Code cũ có onlyActive nhưng chỉ dùng:
         *
         * WHERE 1 = 1
         *
         * Điều này không lọc dữ liệu.
         *
         * Vì schema hiện tại bạn gửi chưa có is_active
         * nên không tự ý thêm điều kiện is_active ở đây.
         */


        sql += `
            ORDER BY
                created_at DESC,
                news_id DESC

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
        // ĐẾM TỔNG NEWS
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM news
            `
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


    // ==========================================================
    // GET ALL NEWS ADMIN
    // PAGINATION
    // Mặc định: 20 news / trang
    // Tối đa: 100 news / trang
    // ==========================================================
    async findAllAdmin(
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

        if (limit > 100) {
            limit = 100;
        }


        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY NEWS ADMIN
        // ======================================================
        const [rows] = await db.query(
            `
            SELECT
                news_id,
                title,
                slug,
                content,
                news_image,
                views,
                likes,
                created_at,
                updated_at,

                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y %H:%i'
                ) AS full_date

            FROM news

            ORDER BY
                created_at DESC,
                news_id DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG NEWS
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM news
            `
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


    // ==========================================================
    // FIND BY ID
    // Không pagination
    // ==========================================================
    async findById(newsId) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM news
            WHERE news_id = ?
            LIMIT 1
            `,
            [newsId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // FIND BY SLUG
    // Không pagination
    // ==========================================================
    async findBySlug(slug) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM news
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CHECK DUPLICATE TITLE OR SLUG
    // Không pagination
    // ==========================================================
    async existsByTitleOrSlug(
        title,
        slug,
        excludeId = null
    ) {

        let sql = `
            SELECT news_id

            FROM news

            WHERE (
                title = ?
                OR slug = ?
            )
        `;

        const params = [
            title.trim(),
            slug
        ];


        if (excludeId != null) {

            sql += `
                AND news_id != ?
            `;

            params.push(
                Number(excludeId)
            );
        }


        const [rows] = await db.query(
            sql,
            params
        );


        return rows.length > 0;
    }


    // ==========================================================
    // CREATE
    // ==========================================================
    async create(data) {

        const {
            title,
            slug,
            content,
            news_image,
            likes
        } = data;


        const [result] = await db.query(
            `
            INSERT INTO news
            (
                title,
                slug,
                content,
                news_image,
                likes,
                views
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                0
            )
            `,
            [
                title.trim(),
                slug,
                content.trim(),
                news_image || null,
                likes || 0
            ]
        );


        return result.insertId;
    }


    // ==========================================================
    // UPDATE
    // ==========================================================
    async update(
        newsId,
        data
    ) {

        const {
            title,
            slug,
            content,
            news_image,
            likes
        } = data;


        const [result] = await db.query(
            `
            UPDATE news

            SET
                title = ?,
                slug = ?,
                content = ?,
                news_image = ?,
                likes = ?

            WHERE news_id = ?
            `,
            [
                title.trim(),
                slug,
                content.trim(),
                news_image || null,
                likes || 0,
                newsId
            ]
        );


        return result.affectedRows;
    }


    // ==========================================================
    // DELETE
    // ==========================================================
    async delete(newsId) {

        const [result] = await db.query(
            `
            DELETE FROM news
            WHERE news_id = ?
            `,
            [newsId]
        );


        return result.affectedRows;
    }


    // ==========================================================
    // LIKE
    // ==========================================================
    async incrementLikes(newsId) {

        const [result] = await db.query(
            `
            UPDATE news

            SET likes = likes + 1

            WHERE news_id = ?
            `,
            [newsId]
        );


        return result.affectedRows;
    }


    // ==========================================================
    // VIEW
    // ==========================================================
    async incrementViews(newsId) {

        const [result] = await db.query(
            `
            UPDATE news

            SET views = views + 1

            WHERE news_id = ?
            `,
            [newsId]
        );


        return result.affectedRows;
    }


    // ==========================================================
    // TRANSACTION
    // ==========================================================
    async getConnection() {

        return db.getConnection();
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


    // ==========================================================
    // CREATE WITH CONNECTION
    // ==========================================================
    async createWithConnection(
        connection,
        data
    ) {

        const {
            title,
            slug,
            content,
            news_image,
            likes
        } = data;


        const [result] = await connection.query(
            `
            INSERT INTO news
            (
                title,
                slug,
                content,
                news_image,
                likes,
                views
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                0
            )
            `,
            [
                title.trim(),
                slug,
                content.trim(),
                news_image || null,
                likes || 0
            ]
        );


        return result.insertId;
    }


    // ==========================================================
    // UPDATE WITH CONNECTION
    // ==========================================================
    async updateWithConnection(
        connection,
        newsId,
        data
    ) {

        const {
            title,
            slug,
            content,
            news_image,
            likes
        } = data;


        const [result] = await connection.query(
            `
            UPDATE news

            SET
                title = ?,
                slug = ?,
                content = ?,
                news_image = ?,
                likes = ?

            WHERE news_id = ?
            `,
            [
                title.trim(),
                slug,
                content.trim(),
                news_image || null,
                likes || 0,
                newsId
            ]
        );


        return result.affectedRows;
    }


    // ==========================================================
    // DELETE WITH CONNECTION
    // ==========================================================
    async deleteWithConnection(
        connection,
        newsId
    ) {

        const [result] = await connection.query(
            `
            DELETE FROM news
            WHERE news_id = ?
            `,
            [newsId]
        );


        return result.affectedRows;
    }
}


module.exports = new NewsRepository();


const db = require("../Config/db");

class NewsRepository {

    // ==========================================================
    // GET ALL NEWS
    // ==========================================================
    async findAll(onlyActive = false) {
        let sql = `
            SELECT
                news_id,
                title,
                slug,
                news_image,
                views,
                likes,
                DATE_FORMAT(created_at,'%d/%m/%Y') AS date,
                IF(
                    LENGTH(content) > 150,
                    CONCAT(LEFT(content,150),'...'),
                    content
                ) AS short_content
            FROM news
        `;

        if (onlyActive) {
            sql += ` WHERE 1 = 1`;
        }

        sql += ` ORDER BY created_at DESC`;

        const [rows] = await db.query(sql);

        return rows;
    }

    // ==========================================================
    // GET ALL NEWS ADMIN
    // ==========================================================
    async findAllAdmin() {
        const [rows] = await db.query(`
            SELECT *,
                   DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') AS full_date
            FROM news
            ORDER BY created_at DESC
        `);

        return rows;
    }

    // ==========================================================
    // FIND BY ID
    // ==========================================================
    async findById(newsId) {
        const [rows] = await db.query(
            `SELECT * FROM news WHERE news_id = ?`,
            [newsId]
        );

        return rows[0] || null;
    }

    // ==========================================================
    // FIND BY SLUG
    // ==========================================================
    async findBySlug(slug) {
        const [rows] = await db.query(
            `SELECT * FROM news WHERE slug = ?`,
            [slug]
        );

        return rows[0] || null;
    }

    // ==========================================================
    // CHECK DUPLICATE TITLE OR SLUG
    // ==========================================================
    async existsByTitleOrSlug(title, slug, excludeId = null) {

        let sql = `
            SELECT news_id
            FROM news
            WHERE (title = ? OR slug = ?)
        `;

        const params = [
            title.trim(),
            slug
        ];

        if (excludeId != null) {
            sql += ` AND news_id != ?`;
            params.push(Number(excludeId));
        }

        const [rows] = await db.query(sql, params);

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
            VALUES (?, ?, ?, ?, ?, 0)
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
    async update(newsId, data) {

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
            `DELETE FROM news WHERE news_id = ?`,
            [newsId]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // LIKE
    // ==========================================================
    async incrementLikes(newsId) {

        const [result] = await db.query(
            `UPDATE news SET likes = likes + 1 WHERE news_id = ?`,
            [newsId]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // VIEW
    // ==========================================================
    async incrementViews(newsId) {

        const [result] = await db.query(
            `UPDATE news SET views = views + 1 WHERE news_id = ?`,
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
    async createWithConnection(connection, data) {

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
            VALUES (?, ?, ?, ?, ?, 0)
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
    async updateWithConnection(connection, newsId, data) {

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
    async deleteWithConnection(connection, newsId) {

        const [result] = await connection.query(
            `DELETE FROM news WHERE news_id = ?`,
            [newsId]
        );

        return result.affectedRows;
    }
}

module.exports = new NewsRepository();
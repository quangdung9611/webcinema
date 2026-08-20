// repositories/NewsRepository.js
const db = require('../Config/db');

class NewsRepository {

    /*=========================================================
        FIND ALL NEWS - KHÔNG PHÂN TRANG (PUBLIC)
    =========================================================*/
    async findAllAll(search = '') {
        search = typeof search === 'string' ? search.trim() : '';

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push('(title LIKE ? OR content LIKE ?)');
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await db.query(`
            SELECT
                news_id,
                title,
                slug,
                news_image,
                news_backdrop,
                views,
                likes,
                created_at,
                DATE_FORMAT(created_at, '%d/%m/%Y') AS date,
                IF(LENGTH(content) > 150, CONCAT(LEFT(content, 150), '...'), content) AS short_content
            FROM news
            ${whereClause}
            ORDER BY created_at DESC, news_id DESC
        `, queryParams);

        return rows;
    }

    /*=========================================================
        FIND ALL NEWS - CÓ PHÂN TRANG (ADMIN)
    =========================================================*/
    async findAll(page = 1, limit = 20, search = '') {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === 'string' ? search.trim() : '';

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push('(title LIKE ? OR content LIKE ?)');
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const [rows] = await db.query(`
            SELECT
                news_id,
                title,
                slug,
                content,
                news_image,
                news_backdrop,
                views,
                likes,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM news
            ${whereClause}
            ORDER BY created_at DESC, news_id DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        const [countRows] = await db.query(`
            SELECT COUNT(*) AS total
            FROM news
            ${whereClause}
        `, queryParams);

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
        FIND BY ID
    =========================================================*/
    async findById(newsId) {
        const [rows] = await db.query(`
            SELECT * FROM news WHERE news_id = ? LIMIT 1
        `, [newsId]);
        return rows[0] || null;
    }

    /*=========================================================
        FIND BY SLUG
    =========================================================*/
    async findBySlug(slug) {
        const [rows] = await db.query(`
            SELECT * FROM news WHERE slug = ? LIMIT 1
        `, [slug]);
        return rows[0] || null;
    }

    /*=========================================================
        CHECK EXISTS BY TITLE OR SLUG
    =========================================================*/
    async existsByTitleOrSlug(title, slug, excludeId = null) {
        let sql = `SELECT news_id FROM news WHERE (title = ? OR slug = ?)`;
        const params = [title.trim(), slug];

        if (excludeId !== null) {
            sql += ` AND news_id != ?`;
            params.push(Number(excludeId));
        }

        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /*=========================================================
        GET IMAGES (cả ảnh chính và backdrop)
    =========================================================*/
    async getImages(newsId) {
        const [rows] = await db.query(`
            SELECT news_image, news_backdrop
            FROM news
            WHERE news_id = ?
        `, [newsId]);
        return rows[0] || null;
    }

    /*=========================================================
        CREATE
    =========================================================*/
    async create(data) {
        const { title, slug, content, news_image, news_backdrop, likes } = data;

        const [result] = await db.query(`
            INSERT INTO news
            (title, slug, content, news_image, news_backdrop, likes, views)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [
            title.trim(),
            slug,
            content.trim(),
            news_image || null,
            news_backdrop || null,
            Number(likes) || 0
        ]);

        return result.insertId;
    }

    /*=========================================================
        UPDATE
    =========================================================*/
    async update(newsId, data) {
        const { title, slug, content, news_image, news_backdrop, likes } = data;

        const [result] = await db.query(`
            UPDATE news
            SET title = ?,
                slug = ?,
                content = ?,
                news_image = ?,
                news_backdrop = ?,
                likes = ?
            WHERE news_id = ?
        `, [
            title.trim(),
            slug,
            content.trim(),
            news_image || null,
            news_backdrop || null,
            Number(likes) || 0,
            newsId
        ]);

        return result.affectedRows;
    }

    /*=========================================================
        DELETE
    =========================================================*/
    async delete(newsId) {
        const [result] = await db.query(`DELETE FROM news WHERE news_id = ?`, [newsId]);
        return result.affectedRows;
    }

    /*=========================================================
        INCREMENT LIKES
    =========================================================*/
    async incrementLikes(newsId) {
        const [result] = await db.query(`
            UPDATE news SET likes = likes + 1 WHERE news_id = ?
        `, [newsId]);
        return result.affectedRows;
    }

    /*=========================================================
        INCREMENT VIEWS
    =========================================================*/
    async incrementViews(newsId) {
        const [result] = await db.query(`
            UPDATE news SET views = views + 1 WHERE news_id = ?
        `, [newsId]);
        return result.affectedRows;
    }

    /*=========================================================
        TRANSACTION SUPPORT
    =========================================================*/
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

    async createWithConnection(connection, data) {
        const { title, slug, content, news_image, news_backdrop, likes } = data;

        const [result] = await connection.query(`
            INSERT INTO news
            (title, slug, content, news_image, news_backdrop, likes, views)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [
            title.trim(),
            slug,
            content.trim(),
            news_image || null,
            news_backdrop || null,
            Number(likes) || 0
        ]);

        return result.insertId;
    }

    async updateWithConnection(connection, newsId, data) {
        const { title, slug, content, news_image, news_backdrop, likes } = data;

        const [result] = await connection.query(`
            UPDATE news
            SET title = ?,
                slug = ?,
                content = ?,
                news_image = ?,
                news_backdrop = ?,
                likes = ?
            WHERE news_id = ?
        `, [
            title.trim(),
            slug,
            content.trim(),
            news_image || null,
            news_backdrop || null,
            Number(likes) || 0,
            newsId
        ]);

        return result.affectedRows;
    }

    async deleteWithConnection(connection, newsId) {
        const [result] = await connection.query(`DELETE FROM news WHERE news_id = ?`, [newsId]);
        return result.affectedRows;
    }
}

module.exports = new NewsRepository();
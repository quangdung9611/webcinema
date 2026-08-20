// repositories/BlogCinemaRepository.js
const db = require('../Config/db');

class BlogCinemaRepository {

    /* =========================================================
        FIND ALL BLOGS - KHÔNG PHÂN TRANG
    ========================================================= */
    async findAllAll(search = '') {
        search = typeof search === 'string' ? search.trim() : '';

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push('(title LIKE ? OR description LIKE ?)');
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await db.query(`
            SELECT
                blog_id,
                title,
                slug,
                description,
                blog_image,
                blog_backdrop,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM blog_cinema
            ${whereClause}
            ORDER BY created_at DESC, blog_id DESC
        `, queryParams);

        return rows;
    }

    /* =========================================================
        FIND ALL BLOGS - CÓ PHÂN TRANG
    ========================================================= */
    async findAll(onlyActive = false, page = 1, limit = 20, search = '') {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === 'string' ? search.trim() : '';

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push('(title LIKE ? OR description LIKE ?)');
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        if (onlyActive) {
            conditions.push('is_active = 1');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const [rows] = await db.query(`
            SELECT
                blog_id,
                title,
                slug,
                description,
                blog_image,
                blog_backdrop,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM blog_cinema
            ${whereClause}
            ORDER BY created_at DESC, blog_id DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        const [countRows] = await db.query(`
            SELECT COUNT(*) AS total
            FROM blog_cinema
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

    /* =========================================================
        FIND BLOG BY ID
    ========================================================= */
    async findById(blogId) {
        const [rows] = await db.query(`
            SELECT * FROM blog_cinema WHERE blog_id = ? LIMIT 1
        `, [blogId]);
        return rows[0] || null;
    }

    /* =========================================================
        FIND BLOG BY SLUG
    ========================================================= */
    async findBySlug(slug) {
        const [rows] = await db.query(`
            SELECT * FROM blog_cinema WHERE slug = ? LIMIT 1
        `, [slug]);
        return rows[0] || null;
    }

    /* =========================================================
        CHECK EXISTS BY TITLE OR SLUG
    ========================================================= */
    async existsByTitleOrSlug(title, slug, excludeId = null) {
        let sql = `SELECT blog_id FROM blog_cinema WHERE (title = ? OR slug = ?)`;
        const params = [title.trim(), slug];

        if (excludeId !== null) {
            sql += ` AND blog_id != ?`;
            params.push(Number(excludeId));
        }

        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /* =========================================================
        GET IMAGES
    ========================================================= */
    async getImages(blogId) {
        const [rows] = await db.query(`
            SELECT blog_image, blog_backdrop
            FROM blog_cinema
            WHERE blog_id = ?
        `, [blogId]);
        return rows[0] || null;
    }

    /* =========================================================
        CREATE BLOG
    ========================================================= */
    async create(data) {
        const { title, slug, description, blog_image, blog_backdrop, likes, is_active } = data;

        const [result] = await db.query(`
            INSERT INTO blog_cinema
            (title, slug, description, blog_image, blog_backdrop, likes, views, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `, [
            title.trim(),
            slug,
            description,
            blog_image || null,
            blog_backdrop || null,
            Number(likes) || 0,
            is_active
        ]);

        return result.insertId;
    }

    /* =========================================================
        UPDATE BLOG
    ========================================================= */
    async update(blogId, data) {
        const { title, slug, description, blog_image, blog_backdrop, likes, is_active } = data;

        const [result] = await db.query(`
            UPDATE blog_cinema
            SET title = ?,
                slug = ?,
                description = ?,
                blog_image = ?,
                blog_backdrop = ?,
                likes = ?,
                is_active = ?
            WHERE blog_id = ?
        `, [
            title.trim(),
            slug,
            description,
            blog_image || null,
            blog_backdrop || null,
            Number(likes) || 0,
            is_active,
            blogId
        ]);

        return result.affectedRows;
    }

    /* =========================================================
        DELETE BLOG
    ========================================================= */
    async delete(blogId) {
        const [result] = await db.query(`DELETE FROM blog_cinema WHERE blog_id = ?`, [blogId]);
        return result.affectedRows;
    }

    /* =========================================================
        INCREMENT VIEWS
    ========================================================= */
    async incrementViews(blogId) {
        const [result] = await db.query(`
            UPDATE blog_cinema SET views = views + 1 WHERE blog_id = ?
        `, [blogId]);
        return result.affectedRows;
    }

    /* =========================================================
        INCREMENT LIKES
    ========================================================= */
    async incrementLikes(blogId) {
        const [result] = await db.query(`
            UPDATE blog_cinema SET likes = likes + 1 WHERE blog_id = ?
        `, [blogId]);
        return result.affectedRows;
    }

    /* =========================================================
        TRANSACTION METHODS
    ========================================================= */
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

    async updateWithConnection(connection, blogId, data) {
        const { title, slug, description, blog_image, blog_backdrop, likes, is_active } = data;

        const [result] = await connection.query(`
            UPDATE blog_cinema
            SET title = ?,
                slug = ?,
                description = ?,
                blog_image = ?,
                blog_backdrop = ?,
                likes = ?,
                is_active = ?
            WHERE blog_id = ?
        `, [
            title.trim(),
            slug,
            description,
            blog_image || null,
            blog_backdrop || null,
            Number(likes) || 0,
            is_active,
            blogId
        ]);

        return result.affectedRows;
    }

    async deleteWithConnection(connection, blogId) {
        const [result] = await connection.query(`DELETE FROM blog_cinema WHERE blog_id = ?`, [blogId]);
        return result.affectedRows;
    }
}

module.exports = new BlogCinemaRepository();
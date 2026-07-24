// Repositories/BlogCinemaRepository.js
const db = require("../Config/db");

class BlogCinemaRepository {

    // ==========================================================
    // LẤY DANH SÁCH BLOG
    // ==========================================================
    async findAll(onlyActive = false) {
        let sql = `
            SELECT
                blog_id,
                title,
                slug,
                description,
                blog_image,
                views,
                likes,
                is_active,
                created_at,
                updated_at
            FROM blog_cinema
        `;

        const params = [];

        if (onlyActive) {
            sql += ` WHERE is_active = 1`;
        }

        sql += ` ORDER BY created_at DESC`;

        const [rows] = await db.query(sql, params);
        return rows;
    }

    // ==========================================================
    // TÌM THEO ID
    // ==========================================================
    async findById(blogId) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM blog_cinema
            WHERE blog_id = ?
            LIMIT 1
            `,
            [blogId]
        );

        return rows[0] || null;
    }

    // ==========================================================
    // TÌM THEO SLUG
    // ==========================================================
    async findBySlug(slug) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM blog_cinema
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );

        return rows[0] || null;
    }

    // ==========================================================
    // KIỂM TRA TITLE HOẶC SLUG
    // ==========================================================
    async existsByTitleOrSlug(title, slug, excludeId = null) {

        let sql = `
            SELECT blog_id
            FROM blog_cinema
            WHERE (title = ? OR slug = ?)
        `;

        const params = [title, slug];

        if (excludeId != null) {
            sql += ` AND blog_id != ?`;
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
            description,
            blog_image,
            likes,
            is_active
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO blog_cinema
            (
                title,
                slug,
                description,
                blog_image,
                likes,
                views,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, 0, ?)
            `,
            [
                title,
                slug,
                description,
                blog_image || null,
                likes || 0,
                is_active
            ]
        );

        return result.insertId;
    }

    // ==========================================================
    // UPDATE
    // ==========================================================
    async update(blogId, data) {

        const {
            title,
            slug,
            description,
            blog_image,
            likes,
            is_active
        } = data;

        const [result] = await db.query(
            `
            UPDATE blog_cinema
            SET
                title = ?,
                slug = ?,
                description = ?,
                blog_image = ?,
                likes = ?,
                is_active = ?
            WHERE blog_id = ?
            `,
            [
                title,
                slug,
                description,
                blog_image,
                likes,
                is_active,
                blogId
            ]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // DELETE
    // ==========================================================
    async delete(blogId) {

        const [result] = await db.query(
            `
            DELETE FROM blog_cinema
            WHERE blog_id = ?
            `,
            [blogId]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // VIEWS
    // ==========================================================
    async incrementViews(blogId) {

        const [result] = await db.query(
            `
            UPDATE blog_cinema
            SET views = views + 1
            WHERE blog_id = ?
            `,
            [blogId]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // LIKES
    // ==========================================================
    async incrementLikes(blogId) {

        const [result] = await db.query(
            `
            UPDATE blog_cinema
            SET likes = likes + 1
            WHERE blog_id = ?
            `,
            [blogId]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // LẤY ẢNH
    // ==========================================================
    async getImage(blogId) {

        const [rows] = await db.query(
            `
            SELECT blog_image
            FROM blog_cinema
            WHERE blog_id = ?
            `,
            [blogId]
        );

        return rows[0] || null;
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
    // UPDATE WITH CONNECTION
    // ==========================================================
    async updateWithConnection(connection, blogId, data) {

        const {
            title,
            slug,
            description,
            blog_image,
            likes,
            is_active
        } = data;

        const [result] = await connection.query(
            `
            UPDATE blog_cinema
            SET
                title = ?,
                slug = ?,
                description = ?,
                blog_image = ?,
                likes = ?,
                is_active = ?
            WHERE blog_id = ?
            `,
            [
                title,
                slug,
                description,
                blog_image,
                likes,
                is_active,
                blogId
            ]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // DELETE WITH CONNECTION
    // ==========================================================
    async deleteWithConnection(connection, blogId) {

        const [result] = await connection.query(
            `
            DELETE FROM blog_cinema
            WHERE blog_id = ?
            `,
            [blogId]
        );

        return result.affectedRows;
    }

}

module.exports = new BlogCinemaRepository();

// Repositories/BlogCinemaRepository.js

const db = require("../Config/db");

class BlogCinemaRepository {

    // ==========================================================
    // LẤY DANH SÁCH BLOG - PAGINATION
    // Mặc định: 20 bài / trang
    // Tối đa: 100 bài / trang
    // ==========================================================
    async findAll(
        onlyActive = false,
        page = 1,
        limit = 20
    ) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------

        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá nhiều dữ liệu
        if (limit > 100) {
            limit = 100;
        }

        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------

        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH BLOG
        // ======================================================

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
            sql += `
                WHERE is_active = 1
            `;
        }

        sql += `
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);


        const [rows] = await db.query(
            sql,
            params
        );


        // ======================================================
        // ĐẾM TỔNG SỐ BLOG
        // ======================================================

        let countSql = `
            SELECT COUNT(*) AS total
            FROM blog_cinema
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


    // ==========================================================
    // TÌM BLOG THEO ID
    // Không pagination
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
    // TÌM BLOG THEO SLUG
    // Không pagination
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
    async existsByTitleOrSlug(
        title,
        slug,
        excludeId = null
    ) {

        let sql = `
            SELECT blog_id
            FROM blog_cinema

            WHERE (title = ? OR slug = ?)
        `;

        const params = [
            title.trim(),
            slug
        ];

        if (excludeId != null) {

            sql += `
                AND blog_id != ?
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
                title.trim(),
                slug,
                description,
                blog_image || null,
                parseInt(likes, 10) || 0,
                is_active
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // UPDATE
    // ==========================================================
    async update(
        blogId,
        data
    ) {

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
                title.trim(),
                slug,
                description,
                blog_image || null,
                parseInt(likes, 10) || 0,
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
    // TĂNG VIEWS
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
    // TĂNG LIKES
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
    // LẤY ẢNH BLOG
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
    async updateWithConnection(
        connection,
        blogId,
        data
    ) {

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
                title.trim(),
                slug,
                description,
                blog_image || null,
                parseInt(likes, 10) || 0,
                is_active,
                blogId
            ]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // DELETE WITH CONNECTION
    // ==========================================================
    async deleteWithConnection(
        connection,
        blogId
    ) {

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


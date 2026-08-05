const db = require("../Config/db");

class BlogCinemaRepository {

    /* ==========================================================
        FIND ALL BLOGS - KHÔNG PHÂN TRANG (DÙNG CHUNG)
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
                blog_id,
                title,
                slug,
                description,
                blog_image,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM blog_cinema
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
        FIND ALL BLOGS - CÓ PHÂN TRANG (ADMIN)
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
                blog_id,
                title,
                slug,
                description,
                blog_image,
                views,
                likes,
                is_active,
                created_at,
                updated_at,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM blog_cinema
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        let countSql = `SELECT COUNT(*) AS total FROM blog_cinema`;
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
        FIND BY ID
    ========================================================== */
    async findById(blogId) {
        const [rows] = await db.query(
            `SELECT * FROM blog_cinema WHERE blog_id = ? LIMIT 1`,
            [blogId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        FIND BY SLUG
    ========================================================== */
    async findBySlug(slug) {
        const [rows] = await db.query(
            `SELECT * FROM blog_cinema WHERE slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK EXIST BY TITLE OR SLUG
    ========================================================== */
    async existsByTitleOrSlug(title, slug, excludeId = null) {
        let sql = `SELECT blog_id FROM blog_cinema WHERE (title = ? OR slug = ?)`;
        const params = [title.trim(), slug];
        if (excludeId != null) {
            sql += ` AND blog_id != ?`;
            params.push(Number(excludeId));
        }
        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /* ==========================================================
        CREATE
    ========================================================== */
    async create(data) {
        const { title, slug, description, blog_image, likes, is_active } = data;
        const [result] = await db.query(
            `
            INSERT INTO blog_cinema
            (title, slug, description, blog_image, likes, views, is_active)
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

    /* ==========================================================
        UPDATE
    ========================================================== */
    async update(blogId, data) {
        const { title, slug, description, blog_image, likes, is_active } = data;
        const [result] = await db.query(
            `
            UPDATE blog_cinema
            SET title = ?, slug = ?, description = ?, blog_image = ?, likes = ?, is_active = ?
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

    /* ==========================================================
        DELETE
    ========================================================== */
    async delete(blogId) {
        const [result] = await db.query(
            `DELETE FROM blog_cinema WHERE blog_id = ?`,
            [blogId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        TĂNG VIEWS
    ========================================================== */
    async incrementViews(blogId) {
        const [result] = await db.query(
            `UPDATE blog_cinema SET views = views + 1 WHERE blog_id = ?`,
            [blogId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        TĂNG LIKES
    ========================================================== */
    async incrementLikes(blogId) {
        const [result] = await db.query(
            `UPDATE blog_cinema SET likes = likes + 1 WHERE blog_id = ?`,
            [blogId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        GET IMAGE
    ========================================================== */
    async getImage(blogId) {
        const [rows] = await db.query(
            `SELECT blog_image FROM blog_cinema WHERE blog_id = ?`,
            [blogId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        TRANSACTION
    ========================================================== */
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
        const { title, slug, description, blog_image, likes, is_active } = data;
        const [result] = await connection.query(
            `
            UPDATE blog_cinema
            SET title = ?, slug = ?, description = ?, blog_image = ?, likes = ?, is_active = ?
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

    async deleteWithConnection(connection, blogId) {
        const [result] = await connection.query(
            `DELETE FROM blog_cinema WHERE blog_id = ?`,
            [blogId]
        );
        return result.affectedRows;
    }
}

module.exports = new BlogCinemaRepository();
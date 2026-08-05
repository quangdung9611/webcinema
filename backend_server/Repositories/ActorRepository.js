const db = require("../Config/db");

class ActorRepository {

    /* ==========================================================
        FIND ALL ACTORS - KHÔNG PHÂN TRANG (DÙNG CHUNG)
    ========================================================== */
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE (name LIKE ? OR nationality LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const [rows] = await db.query(
            `
            SELECT
                actor_id,
                name,
                gender,
                nationality,
                actor_avatar,
                biography,
                birthday,
                slug,
                created_at,
                updated_at
            FROM actors
            ${whereClause}
            ORDER BY actor_id DESC
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
        FIND ALL ACTORS - CÓ PHÂN TRANG (ADMIN)
    ========================================================== */
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE (name LIKE ? OR nationality LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                actor_id,
                name,
                gender,
                nationality,
                actor_avatar,
                biography,
                birthday,
                slug,
                created_at,
                updated_at
            FROM actors
            ${whereClause}
            ORDER BY actor_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        let countSql = `SELECT COUNT(*) AS total FROM actors`;
        const countParams = [...queryParams];
        if (search) {
            countSql += ` WHERE (name LIKE ? OR nationality LIKE ?)`;
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
        FIND ACTOR BY ID
    ========================================================== */
    async findById(actorId) {
        const [rows] = await db.query(
            `SELECT * FROM actors WHERE actor_id = ? LIMIT 1`,
            [actorId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        FIND ACTOR BY SLUG (kèm danh sách phim)
    ========================================================== */
    async findBySlugWithMovies(slug) {
        const [actorRows] = await db.query(
            `SELECT * FROM actors WHERE slug = ? LIMIT 1`,
            [slug]
        );
        const actor = actorRows[0];
        if (!actor) return null;

        const [movies] = await db.query(
            `
            SELECT m.movie_id, m.title, m.slug, m.movie_poster, m.release_date
            FROM movies m
            JOIN movie_actors ma ON m.movie_id = ma.movie_id
            WHERE ma.actor_id = ?
            ORDER BY m.release_date DESC
            `,
            [actor.actor_id]
        );
        actor.movies = movies;
        return actor;
    }

    /* ==========================================================
        CHECK EXIST BY NAME OR SLUG
    ========================================================== */
    async existsByNameOrSlug(name, slug, excludeId = null) {
        let sql = `SELECT actor_id FROM actors WHERE (name = ? OR slug = ?)`;
        const params = [name.trim(), slug];
        if (excludeId != null) {
            sql += ` AND actor_id != ?`;
            params.push(Number(excludeId));
        }
        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /* ==========================================================
        GET AVATAR (để xóa trên Cloudinary)
    ========================================================== */
    async getAvatar(actorId) {
        const [rows] = await db.query(
            `SELECT actor_avatar FROM actors WHERE actor_id = ?`,
            [actorId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE ACTOR
    ========================================================== */
    async create(data) {
        const { name, slug, gender, nationality, actor_avatar, biography, birthday } = data;
        const [result] = await db.query(
            `
            INSERT INTO actors (name, slug, gender, nationality, actor_avatar, biography, birthday)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [name.trim(), slug, gender, nationality.trim(), actor_avatar || null, biography.trim(), birthday]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE ACTOR
    ========================================================== */
    async update(actorId, data) {
        const { name, slug, gender, nationality, actor_avatar, biography, birthday } = data;
        const [result] = await db.query(
            `
            UPDATE actors
            SET name = ?, slug = ?, gender = ?, nationality = ?, actor_avatar = ?, biography = ?, birthday = ?
            WHERE actor_id = ?
            `,
            [name.trim(), slug, gender, nationality.trim(), actor_avatar || null, biography.trim(), birthday, actorId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE ACTOR
    ========================================================== */
    async delete(actorId) {
        const [result] = await db.query(`DELETE FROM actors WHERE actor_id = ?`, [actorId]);
        return result.affectedRows;
    }

    /* ==========================================================
        TRANSACTION SUPPORT
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
    async createWithConnection(connection, data) {
        const { name, slug, gender, nationality, actor_avatar, biography, birthday } = data;
        const [result] = await connection.query(
            `
            INSERT INTO actors (name, slug, gender, nationality, actor_avatar, biography, birthday)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [name.trim(), slug, gender, nationality.trim(), actor_avatar || null, biography.trim(), birthday]
        );
        return result.insertId;
    }
    async updateWithConnection(connection, actorId, data) {
        const { name, slug, gender, nationality, actor_avatar, biography, birthday } = data;
        const [result] = await connection.query(
            `
            UPDATE actors
            SET name = ?, slug = ?, gender = ?, nationality = ?, actor_avatar = ?, biography = ?, birthday = ?
            WHERE actor_id = ?
            `,
            [name.trim(), slug, gender, nationality.trim(), actor_avatar || null, biography.trim(), birthday, actorId]
        );
        return result.affectedRows;
    }
    async deleteWithConnection(connection, actorId) {
        const [result] = await connection.query(`DELETE FROM actors WHERE actor_id = ?`, [actorId]);
        return result.affectedRows;
    }
}

module.exports = new ActorRepository();
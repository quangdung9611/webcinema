const db = require("../Config/db");

class GenreRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG (ADMIN)
    ========================================================== */
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE genre_name LIKE ?`;
            queryParams.push(`%${search}%`);
        }

        const [rows] = await db.query(
            `
            SELECT genre_id, genre_name, slug
            FROM genres
            ${whereClause}
            ORDER BY genre_id DESC
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
        FIND ALL - CÓ PHÂN TRANG (ADMIN)
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
            whereClause = `WHERE genre_name LIKE ?`;
            queryParams.push(`%${search}%`);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT genre_id, genre_name, slug
            FROM genres
            ${whereClause}
            ORDER BY genre_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const countSql = `SELECT COUNT(*) AS total FROM genres ${whereClause}`;
        const [countRows] = await db.query(countSql, queryParams);
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

    // ❌ ĐÃ XÓA HÀM findAllPublic (không cần dùng)

    /* ==========================================================
        GET BY ID
    ========================================================== */
    async findById(genreId) {
        const [rows] = await db.query(
            `SELECT * FROM genres WHERE genre_id = ? LIMIT 1`,
            [genreId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE NAME / SLUG
    ========================================================== */
    async findByNameOrSlug(name, slug, excludeGenreId = null) {
        let sql = `SELECT genre_id FROM genres WHERE (genre_name = ? OR slug = ?)`;
        const params = [name.trim(), slug];
        if (excludeGenreId != null) {
            sql += ` AND genre_id != ?`;
            params.push(Number(excludeGenreId));
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK GENRE LINKED TO MOVIE
    ========================================================== */
    async checkLinked(genreId) {
        const [rows] = await db.query(
            `SELECT movie_id FROM movie_genres WHERE genre_id = ? LIMIT 1`,
            [genreId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE
    ========================================================== */
    async create(data) {
        const { genre_name, slug } = data;
        const [result] = await db.query(
            `INSERT INTO genres (genre_name, slug) VALUES (?, ?)`,
            [genre_name.trim(), slug]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE
    ========================================================== */
    async update(genreId, data) {
        const { genre_name, slug } = data;
        const [result] = await db.query(
            `UPDATE genres SET genre_name = ?, slug = ? WHERE genre_id = ?`,
            [genre_name.trim(), slug, genreId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE
    ========================================================== */
    async delete(genreId) {
        const [result] = await db.query(`DELETE FROM genres WHERE genre_id = ?`, [genreId]);
        return result.affectedRows;
    }
}

module.exports = new GenreRepository();
const db = require("../Config/db");

class GenreRepository {

    /*=========================================================
        FIND ALL - KHÔNG PHÂN TRANG
        RETURN: rows[] (mảng trực tiếp)
    =========================================================*/
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = "WHERE genre_name LIKE ?";
            queryParams.push(`%${search}%`);
        }

        const [rows] = await db.query(
            `
            SELECT
                genre_id,
                genre_name,
                slug
            FROM genres
            ${whereClause}
            ORDER BY genre_id DESC
            `,
            queryParams
        );

        return rows; // 👈 TRẢ VỀ MẢNG TRỰC TIẾP
    }

    /*=========================================================
        FIND ALL - CÓ PHÂN TRANG (ADMIN)
        RETURN: { data: [], pagination: {} }
    =========================================================*/
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (Number.isNaN(page) || page < 1) page = 1;
        if (Number.isNaN(limit) || limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = "WHERE genre_name LIKE ?";
            queryParams.push(`%${search}%`);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                genre_id,
                genre_name,
                slug
            FROM genres
            ${whereClause}
            ORDER BY genre_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM genres ${whereClause}`,
            queryParams
        );

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
    async findById(genreId) {
        const [rows] = await db.query(
            `SELECT * FROM genres WHERE genre_id = ? LIMIT 1`,
            [genreId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CHECK DUPLICATE NAME / SLUG
    =========================================================*/
    async findByNameOrSlug(name, slug, excludeGenreId = null) {
        let sql = `SELECT genre_id FROM genres WHERE genre_name = ? OR slug = ?`;
        const params = [name.trim(), slug];
        if (excludeGenreId !== null) {
            sql += ` AND genre_id != ?`;
            params.push(Number(excludeGenreId));
        }
        sql += ` LIMIT 1`;
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /*=========================================================
        CHECK GENRE LINKED TO MOVIE
    =========================================================*/
    async checkLinked(genreId) {
        const [rows] = await db.query(
            `SELECT movie_id FROM movie_genres WHERE genre_id = ? LIMIT 1`,
            [genreId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CREATE
    =========================================================*/
    async create(data) {
        const { genre_name, slug } = data;
        const [result] = await db.query(
            `INSERT INTO genres (genre_name, slug) VALUES (?, ?)`,
            [genre_name.trim(), slug]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE
    =========================================================*/
    async update(genreId, data) {
        const { genre_name, slug } = data;
        const [result] = await db.query(
            `UPDATE genres SET genre_name = ?, slug = ? WHERE genre_id = ?`,
            [genre_name.trim(), slug, genreId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE
    =========================================================*/
    async delete(genreId) {
        const [result] = await db.query(
            `DELETE FROM genres WHERE genre_id = ?`,
            [genreId]
        );
        return result.affectedRows;
    }
}

module.exports = new GenreRepository();
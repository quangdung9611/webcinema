const db = require("../Config/db");

class GenreRepository {

    /* ==========================================================
        GET ALL
    ========================================================== */

    async findAll() {
        const [rows] = await db.query(`
            SELECT *
            FROM genres
            ORDER BY genre_id DESC
        `);

        return rows;
    }

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
        CHECK DUPLICATE
    ========================================================== */

    async findByNameOrSlug(name, slug, excludeGenreId = null) {

        let sql = `
            SELECT genre_id
            FROM genres
            WHERE (genre_name = ? OR slug = ?)
        `;

        const params = [
            name.trim(),
            slug
        ];

        if (excludeGenreId) {
            sql += ` AND genre_id != ?`;
            params.push(excludeGenreId);
        }

        const [rows] = await db.query(sql, params);

        return rows[0] || null;
    }

    /* ==========================================================
        CHECK LINKED
    ========================================================== */

    async checkLinked(genreId) {

        const [rows] = await db.query(
            `
            SELECT movie_id
            FROM movie_genres
            WHERE genre_id = ?
            LIMIT 1
            `,
            [genreId]
        );

        return rows[0] || null;
    }

    /* ==========================================================
        CREATE
    ========================================================== */

    async create(data) {

        const {
            genre_name,
            slug
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO genres
            (
                genre_name,
                slug
            )
            VALUES (?,?)
            `,
            [
                genre_name.trim(),
                slug
            ]
        );

        return result.insertId;
    }

    /* ==========================================================
        UPDATE
    ========================================================== */

    async update(genreId, data) {

        const {
            genre_name,
            slug
        } = data;

        const [result] = await db.query(
            `
            UPDATE genres
            SET
                genre_name = ?,
                slug = ?
            WHERE genre_id = ?
            `,
            [
                genre_name.trim(),
                slug,
                genreId
            ]
        );

        return result.affectedRows;
    }

    /* ==========================================================
        DELETE
    ========================================================== */

    async delete(genreId) {

        const [result] = await db.query(
            `DELETE FROM genres WHERE genre_id = ?`,
            [genreId]
        );

        return result.affectedRows;
    }

}

module.exports = new GenreRepository();
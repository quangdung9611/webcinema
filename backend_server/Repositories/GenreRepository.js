
const db = require("../Config/db");

class GenreRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG
        DÙNG CHUNG
    ========================================================== */
    async findAllAll(search = "") {
        search =
            typeof search === "string"
                ? search.trim()
                : "";

        const conditions = [];
        const queryParams = [];

        // ------------------------------------------------------
        // SEARCH
        // ------------------------------------------------------
        if (search) {
            conditions.push(
                "genre_name LIKE ?"
            );

            queryParams.push(
                `%${search}%`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // ------------------------------------------------------
        // GET DATA
        // ------------------------------------------------------
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

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------
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
        FIND ALL - CÓ PHÂN TRANG
        ADMIN
    ========================================================== */
    async findAll(
        page = 1,
        limit = 20,
        search = ""
    ) {
        // ------------------------------------------------------
        // NORMALIZE PAGINATION
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (Number.isNaN(page) || page < 1) {
            page = 1;
        }

        if (Number.isNaN(limit) || limit < 1) {
            limit = 20;
        }

        if (limit > 100) {
            limit = 100;
        }

        // ------------------------------------------------------
        // NORMALIZE SEARCH
        // ------------------------------------------------------
        search =
            typeof search === "string"
                ? search.trim()
                : "";

        const conditions = [];
        const queryParams = [];

        // ------------------------------------------------------
        // SEARCH
        // ------------------------------------------------------
        if (search) {
            conditions.push(
                "genre_name LIKE ?"
            );

            queryParams.push(
                `%${search}%`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // ------------------------------------------------------
        // OFFSET
        // ------------------------------------------------------
        const offset =
            (page - 1) * limit;

        // ------------------------------------------------------
        // GET DATA
        // ------------------------------------------------------
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
            [
                ...queryParams,
                limit,
                offset
            ]
        );

        // ------------------------------------------------------
        // COUNT TOTAL
        // ------------------------------------------------------
        const [countRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total
                FROM genres
                ${whereClause}
                `,
                queryParams
            );

        const total =
            Number(
                countRows[0]?.total || 0
            );

        const totalPages =
            Math.ceil(
                total / limit
            ) || 1;

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------
        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage:
                    page > 1,
                hasNextPage:
                    page < totalPages
            }
        };
    }

    /* ==========================================================
        GET GENRE BY ID
    ========================================================== */
    async findById(genreId) {
        const [rows] =
            await db.query(
                `
                SELECT *
                FROM genres
                WHERE genre_id = ?
                LIMIT 1
                `,
                [genreId]
            );

        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE NAME / SLUG
    ========================================================== */
    async findByNameOrSlug(
        name,
        slug,
        excludeGenreId = null
    ) {
        let sql = `
            SELECT
                genre_id
            FROM genres
            WHERE
                (
                    genre_name = ?
                    OR slug = ?
                )
        `;

        const params = [
            name.trim(),
            slug
        ];

        // ------------------------------------------------------
        // EXCLUDE CURRENT GENRE WHEN UPDATE
        // ------------------------------------------------------
        if (excludeGenreId !== null) {
            sql += `
                AND genre_id != ?
            `;

            params.push(
                Number(excludeGenreId)
            );
        }

        sql += `
            LIMIT 1
        `;

        const [rows] =
            await db.query(
                sql,
                params
            );

        return rows[0] || null;
    }

    /* ==========================================================
        CHECK GENRE LINKED TO MOVIE
    ========================================================== */
    async checkLinked(genreId) {
        const [rows] =
            await db.query(
                `
                SELECT
                    movie_id
                FROM movie_genres
                WHERE genre_id = ?
                LIMIT 1
                `,
                [genreId]
            );

        return rows[0] || null;
    }

    /* ==========================================================
        CREATE GENRE
    ========================================================== */
    async create(data) {
        const {
            genre_name,
            slug
        } = data;

        const [result] =
            await db.query(
                `
                INSERT INTO genres
                (
                    genre_name,
                    slug
                )
                VALUES (?, ?)
                `,
                [
                    genre_name.trim(),
                    slug
                ]
            );

        return result.insertId;
    }

    /* ==========================================================
        UPDATE GENRE
    ========================================================== */
    async update(
        genreId,
        data
    ) {
        const {
            genre_name,
            slug
        } = data;

        const [result] =
            await db.query(
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
        DELETE GENRE
    ========================================================== */
    async delete(genreId) {
        const [result] =
            await db.query(
                `
                DELETE FROM genres
                WHERE genre_id = ?
                `,
                [genreId]
            );

        return result.affectedRows;
    }
}

// ==========================================================
// EXPORT
// ==========================================================
module.exports = new GenreRepository();


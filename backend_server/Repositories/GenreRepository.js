
const db = require("../Config/db");

class GenreRepository {

    // ==========================================================
    // GET ALL GENRES - PAGINATION
    //
    // Mặc định: 20 genre / trang
    // Tối đa: 100 genre / trang
    // Dùng cho ADMIN
    // ==========================================================

    async findAll(page = 1, limit = 20) {

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
        // LẤY DANH SÁCH GENRE
        // ======================================================

        const [rows] = await db.query(
            `
            SELECT
                genre_id,
                genre_name,
                slug

            FROM genres

            ORDER BY genre_id DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ GENRE
        // ======================================================

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total

            FROM genres
            `
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

                hasPreviousPage:
                    page > 1,

                hasNextPage:
                    page < totalPages
            }
        };
    }


    // ==========================================================
    // GET BY ID
    // Không pagination
    // ==========================================================

    async findById(genreId) {

        const [rows] = await db.query(
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


    // ==========================================================
    // CHECK DUPLICATE NAME / SLUG
    // ==========================================================

    async findByNameOrSlug(
        name,
        slug,
        excludeGenreId = null
    ) {

        let sql = `
            SELECT genre_id

            FROM genres

            WHERE (
                genre_name = ?
                OR slug = ?
            )
        `;

        const params = [
            name.trim(),
            slug
        ];


        // ------------------------------------------------------
        // UPDATE → loại trừ genre hiện tại
        // ------------------------------------------------------

        if (excludeGenreId != null) {

            sql += `
                AND genre_id != ?
            `;

            params.push(
                Number(excludeGenreId)
            );
        }


        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CHECK GENRE ĐÃ ĐƯỢC LIÊN KẾT VỚI MOVIE CHƯA
    // ==========================================================

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


    // ==========================================================
    // CREATE
    // ==========================================================

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

            VALUES (?, ?)
            `,
            [
                genre_name.trim(),
                slug
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // UPDATE
    // ==========================================================

    async update(
        genreId,
        data
    ) {

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


    // ==========================================================
    // DELETE
    // ==========================================================

    async delete(genreId) {

        const [result] = await db.query(
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


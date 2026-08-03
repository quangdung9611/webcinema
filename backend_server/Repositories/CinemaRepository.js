
const db = require("../Config/db");

class CinemaRepository {

    // ==========================================================
    // GET ALL - PAGINATION
    // Mặc định: 20 rạp / trang
    // Tối đa: 100 rạp / trang
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
        // LẤY DANH SÁCH RẠP
        // ======================================================
        const [rows] = await db.query(
            `
            SELECT
                cinema_id,
                cinema_name,
                slug,
                address,
                city,
                hotline,
                map_link,

                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y %H:%i'
                ) AS created_at

            FROM cinemas

            ORDER BY cinema_id DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ RẠP
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM cinemas
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

                hasPreviousPage: page > 1,

                hasNextPage: page < totalPages
            }
        };
    }


    // ==========================================================
    // GET BY ID
    // Không pagination
    // ==========================================================
    async findById(cinemaId) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM cinemas
            WHERE cinema_id = ?
            LIMIT 1
            `,
            [cinemaId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // GET BY SLUG
    // Không pagination
    // ==========================================================
    async findBySlug(slug) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM cinemas
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CHECK NAME
    // ==========================================================
    async findByName(
        cinemaName,
        excludeCinemaId = null
    ) {

        let sql = `
            SELECT cinema_id
            FROM cinemas
            WHERE cinema_name = ?
        `;

        const params = [
            cinemaName.trim()
        ];

        if (excludeCinemaId) {

            sql += `
                AND cinema_id != ?
            `;

            params.push(excludeCinemaId);
        }

        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CHECK HOTLINE
    // ==========================================================
    async findByHotline(
        hotline,
        excludeCinemaId = null
    ) {

        let sql = `
            SELECT cinema_id
            FROM cinemas
            WHERE hotline = ?
        `;

        const params = [
            hotline
        ];

        if (excludeCinemaId) {

            sql += `
                AND cinema_id != ?
            `;

            params.push(excludeCinemaId);
        }

        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CREATE
    // ==========================================================
    async create(data) {

        const {
            cinema_name,
            slug,
            address,
            city,
            hotline,
            map_link
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO cinemas
            (
                cinema_name,
                slug,
                address,
                city,
                hotline,
                map_link
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                cinema_name.trim(),
                slug,
                address.trim(),
                city.trim(),
                hotline.trim(),
                map_link.trim()
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // UPDATE
    // ==========================================================
    async update(
        cinemaId,
        data
    ) {

        const {
            cinema_name,
            slug,
            address,
            city,
            hotline,
            map_link
        } = data;

        const [result] = await db.query(
            `
            UPDATE cinemas

            SET
                cinema_name = ?,
                slug = ?,
                address = ?,
                city = ?,
                hotline = ?,
                map_link = ?

            WHERE cinema_id = ?
            `,
            [
                cinema_name.trim(),
                slug,
                address.trim(),
                city.trim(),
                hotline.trim(),
                map_link.trim(),
                cinemaId
            ]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // DELETE
    // ==========================================================
    async delete(cinemaId) {

        const [result] = await db.query(
            `
            DELETE FROM cinemas
            WHERE cinema_id = ?
            `,
            [cinemaId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // MOVIES OF CINEMA
    // Không pagination
    // Dùng để lấy phim + suất chiếu của một rạp
    // ==========================================================
    async getMoviesByCinema(cinemaId) {

        const [rows] = await db.query(
            `
            SELECT
                m.movie_id,
                m.title,
                m.movie_poster,

                s.showtime_id,
                s.start_time

            FROM showtimes s

            INNER JOIN movies m
                ON s.movie_id = m.movie_id

            WHERE s.cinema_id = ?

            ORDER BY s.start_time ASC
            `,
            [cinemaId]
        );

        return rows;
    }
}

module.exports = new CinemaRepository();


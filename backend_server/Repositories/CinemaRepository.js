const db = require('../Config/db');

class CinemaRepository {

    /* ==========================================================
        FIND ALL CINEMAS - KHÔNG PHÂN TRANG
    ========================================================== */
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push("(cinema_name LIKE ? OR city LIKE ? OR address LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
                cinema_backdrop,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM cinemas
            ${whereClause}
            ORDER BY cinema_id DESC
            `,
            queryParams
        );

        return rows;
    }

    /* ==========================================================
        FIND ALL CINEMAS - CÓ PHÂN TRANG
    ========================================================== */
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";

        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push("(cinema_name LIKE ? OR city LIKE ? OR address LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const offset = (page - 1) * limit;

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
                cinema_backdrop,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM cinemas
            ${whereClause}
            ORDER BY cinema_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM cinemas ${whereClause}`,
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

    /* ==========================================================
        FIND BY ID
    ========================================================== */
    async findById(cinemaId) {
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
                cinema_backdrop,
                created_at,
                updated_at
            FROM cinemas
            WHERE cinema_id = ?
            LIMIT 1
            `,
            [cinemaId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        FIND BY SLUG (PUBLIC)
    ========================================================== */
    async findBySlug(slug) {
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
                cinema_backdrop,
                created_at,
                updated_at
            FROM cinemas
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        FIND BY NAME (KIỂM TRA TRÙNG)
    ========================================================== */
    async findByName(cinemaName, excludeCinemaId = null) {
        let sql = `SELECT cinema_id FROM cinemas WHERE cinema_name = ?`;
        const params = [cinemaName.trim()];
        if (excludeCinemaId != null) {
            sql += ` AND cinema_id != ?`;
            params.push(Number(excludeCinemaId));
        }
        sql += ` LIMIT 1`;
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        FIND BY HOTLINE (KIỂM TRA TRÙNG)
    ========================================================== */
    async findByHotline(hotline, excludeCinemaId = null) {
        let sql = `SELECT cinema_id FROM cinemas WHERE hotline = ?`;
        const params = [hotline];
        if (excludeCinemaId != null) {
            sql += ` AND cinema_id != ?`;
            params.push(Number(excludeCinemaId));
        }
        sql += ` LIMIT 1`;
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE CINEMA
    ========================================================== */
    async create(data) {
        const {
            cinema_name,
            slug,
            address,
            city,
            hotline,
            map_link,
            cinema_backdrop
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO cinemas (
                cinema_name,
                slug,
                address,
                city,
                hotline,
                map_link,
                cinema_backdrop
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                cinema_name.trim(),
                slug,
                address.trim(),
                city.trim(),
                hotline.trim(),
                map_link.trim(),
                cinema_backdrop || null
            ]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE CINEMA
    ========================================================== */
    async update(cinemaId, data) {
        const {
            cinema_name,
            slug,
            address,
            city,
            hotline,
            map_link,
            cinema_backdrop
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
                map_link = ?,
                cinema_backdrop = ?
            WHERE cinema_id = ?
            `,
            [
                cinema_name.trim(),
                slug,
                address.trim(),
                city.trim(),
                hotline.trim(),
                map_link.trim(),
                cinema_backdrop || null,
                cinemaId
            ]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE CINEMA
    ========================================================== */
    async delete(cinemaId) {
        const [result] = await db.query(
            `DELETE FROM cinemas WHERE cinema_id = ?`,
            [cinemaId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        GET MOVIES BY CINEMA (PUBLIC DETAIL)
    ========================================================== */
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
            INNER JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.cinema_id = ?
            ORDER BY s.start_time ASC
            `,
            [cinemaId]
        );
        return rows;
    }
}

module.exports = new CinemaRepository();
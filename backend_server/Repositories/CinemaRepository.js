const db = require("../Config/db");

class CinemaRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG (DÙNG CHUNG)
    ========================================================== */
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `WHERE (cinema_name LIKE ? OR city LIKE ? OR address LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

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
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM cinemas
            ${whereClause}
            ORDER BY cinema_id DESC
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
            whereClause = `WHERE (cinema_name LIKE ? OR city LIKE ? OR address LIKE ?)`;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

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
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM cinemas
            ${whereClause}
            ORDER BY cinema_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM cinemas
            ${whereClause}
            `,
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
        GET BY ID
    ========================================================== */
    async findById(cinemaId) {
        const [rows] = await db.query(
            `SELECT * FROM cinemas WHERE cinema_id = ? LIMIT 1`,
            [cinemaId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        GET BY SLUG
    ========================================================== */
    async findBySlug(slug) {
        const [rows] = await db.query(
            `SELECT * FROM cinemas WHERE slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE NAME
    ========================================================== */
    async findByName(cinemaName, excludeCinemaId = null) {
        let sql = `SELECT cinema_id FROM cinemas WHERE cinema_name = ?`;
        const params = [cinemaName.trim()];
        if (excludeCinemaId) {
            sql += ` AND cinema_id != ?`;
            params.push(excludeCinemaId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE HOTLINE
    ========================================================== */
    async findByHotline(hotline, excludeCinemaId = null) {
        let sql = `SELECT cinema_id FROM cinemas WHERE hotline = ?`;
        const params = [hotline];
        if (excludeCinemaId) {
            sql += ` AND cinema_id != ?`;
            params.push(excludeCinemaId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CREATE
    ========================================================== */
    async create(data) {
        const { cinema_name, slug, address, city, hotline, map_link } = data;
        const [result] = await db.query(
            `
            INSERT INTO cinemas (cinema_name, slug, address, city, hotline, map_link)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [cinema_name.trim(), slug, address.trim(), city.trim(), hotline.trim(), map_link.trim()]
        );
        return result.insertId;
    }

    /* ==========================================================
        UPDATE
    ========================================================== */
    async update(cinemaId, data) {
        const { cinema_name, slug, address, city, hotline, map_link } = data;
        const [result] = await db.query(
            `
            UPDATE cinemas
            SET cinema_name = ?, slug = ?, address = ?, city = ?, hotline = ?, map_link = ?
            WHERE cinema_id = ?
            `,
            [cinema_name.trim(), slug, address.trim(), city.trim(), hotline.trim(), map_link.trim(), cinemaId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        DELETE
    ========================================================== */
    async delete(cinemaId) {
        const [result] = await db.query(
            `DELETE FROM cinemas WHERE cinema_id = ?`,
            [cinemaId]
        );
        return result.affectedRows;
    }

    /* ==========================================================
        MOVIES OF CINEMA (for public detail)
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
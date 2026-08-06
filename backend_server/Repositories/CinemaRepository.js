const db = require("../Config/db");

class CinemaRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG
        TRẢ VỀ TRỰC TIẾP MẢNG
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
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM cinemas
            ${whereClause}
            ORDER BY cinema_id DESC
            `,
            queryParams
        );

        // ✅ Trả về mảng trực tiếp
        return rows;
    }

    /* ==========================================================
        FIND ALL - CÓ PHÂN TRANG (ADMIN)
        TRẢ VỀ { data, pagination }
    ========================================================== */
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) page = 1;
        if (!Number.isInteger(limit) || limit < 1) limit = 20;
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
        FIND CINEMA BY ID
    ========================================================== */
    async findById(cinemaId) {
        const [rows] = await db.query(
            `SELECT * FROM cinemas WHERE cinema_id = ? LIMIT 1`,
            [cinemaId]
        );
        return rows[0] || null;
    }

    /* ==========================================================
        FIND CINEMA BY SLUG
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
        if (excludeCinemaId != null) {
            sql += ` AND cinema_id != ?`;
            params.push(Number(excludeCinemaId));
        }
        sql += ` LIMIT 1`;
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /* ==========================================================
        CHECK DUPLICATE HOTLINE
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
        GET MOVIES OF CINEMA
    ========================================================== */
    async getMoviesByCinema(cinemaId) {
        const [rows] = await db.query(
            `
            SELECT m.movie_id, m.title, m.movie_poster, s.showtime_id, s.start_time
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
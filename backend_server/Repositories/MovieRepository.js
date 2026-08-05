// repositories/MovieRepository.js
const db = require('../Config/db');

class MovieRepository {

    /*=========================================================
        FIND ALL MOVIES - KHÔNG PHÂN TRANG (có search)
    =========================================================*/
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE
                    title LIKE ?
                    OR director LIKE ?
                    OR nation LIKE ?
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const [rows] = await db.query(
            `
            SELECT *
            FROM movies
            ${whereClause}
            ORDER BY created_at DESC
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

    /*=========================================================
        FIND ALL MOVIES - CÓ PHÂN TRANG (có search)
    =========================================================*/
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
            whereClause = `
                WHERE
                    title LIKE ?
                    OR director LIKE ?
                    OR nation LIKE ?
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `
            SELECT *
            FROM movies
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM movies
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
                totalPages: totalPages > 0 ? totalPages : 1,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /*=========================================================
        FIND MOVIE BY ID
    =========================================================*/
    async findById(movieId) {
        const [rows] = await db.query(
            `SELECT * FROM movies WHERE movie_id = ? LIMIT 1`,
            [movieId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        FIND MOVIE BY SLUG
    =========================================================*/
    async findBySlug(slug) {
        const [rows] = await db.query(
            `
            SELECT
                m.*,
                COUNT(r.review_id) AS total_reviews,
                IFNULL(ROUND(AVG(r.rating_score), 1), 0) AS avg_rating
            FROM movies m
            LEFT JOIN reviews r ON m.movie_id = r.movie_id
            WHERE m.slug = ?
            GROUP BY m.movie_id
            LIMIT 1
            `,
            [slug]
        );
        return rows[0] || null;
    }

    /*=========================================================
        GET GENRES BY MOVIE ID
    =========================================================*/
    async getGenresByMovieId(movieId) {
        const [rows] = await db.query(
            `
            SELECT g.genre_id, g.genre_name
            FROM genres g
            JOIN movie_genres mg ON g.genre_id = mg.genre_id
            WHERE mg.movie_id = ?
            `,
            [movieId]
        );
        return rows;
    }

    /*=========================================================
        GET ACTORS BY MOVIE ID
    =========================================================*/
    async getActorsByMovieId(movieId) {
        const [rows] = await db.query(
            `
            SELECT a.actor_id, a.name, a.actor_avatar, a.slug
            FROM actors a
            JOIN movie_actors ma ON a.actor_id = ma.actor_id
            WHERE ma.movie_id = ?
            `,
            [movieId]
        );
        return rows;
    }

    /*=========================================================
        GET SHOWTIMES BY MOVIE ID
    =========================================================*/
    async getShowtimesByMovieId(movieId) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                s.start_time,
                r.room_name,
                r.room_type,
                c.cinema_name,
                c.address
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON r.cinema_id = c.cinema_id
            WHERE s.movie_id = ? AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId]
        );
        return rows;
    }

    /*=========================================================
        CHECK EXISTS BY TITLE OR SLUG
    =========================================================*/
    async existsByTitleOrSlug(title, slug, excludeId = null) {
        let sql = `
            SELECT movie_id
            FROM movies
            WHERE (title = ? OR slug = ?)
        `;
        const params = [title, slug];
        if (excludeId != null) {
            sql += ` AND movie_id != ?`;
            params.push(Number(excludeId));
        }
        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    }

    /*=========================================================
        CREATE MOVIE
    =========================================================*/
    async create(movieData) {
        const {
            title, slug, description, director, nation, duration,
            age_rating, movie_poster, movie_backdrop, trailer_url,
            release_date, status, total_likes
        } = movieData;

        const [result] = await db.query(
            `
            INSERT INTO movies
            (title, slug, description, director, nation, duration, age_rating, movie_poster, movie_backdrop, trailer_url, release_date, status, total_likes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                title, slug, description || "", director, nation, duration,
                age_rating, movie_poster || null, movie_backdrop || null,
                trailer_url || null, release_date, status, total_likes || 0
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE MOVIE
    =========================================================*/
    async update(movieId, movieData) {
        const {
            title, slug, director, nation, duration, age_rating,
            release_date, status, description, movie_poster,
            movie_backdrop, trailer_url, total_likes
        } = movieData;

        const [result] = await db.query(
            `
            UPDATE movies
            SET
                title = ?, slug = ?, director = ?, nation = ?, duration = ?,
                age_rating = ?, release_date = ?, status = ?, description = ?,
                movie_poster = ?, movie_backdrop = ?, trailer_url = ?, total_likes = ?
            WHERE movie_id = ?
            `,
            [
                title, slug, director, nation, duration, age_rating,
                release_date, status, description || "", movie_poster,
                movie_backdrop, trailer_url || null, total_likes || 0, movieId
            ]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE MOVIE
    =========================================================*/
    async delete(movieId) {
        const [result] = await db.query(`DELETE FROM movies WHERE movie_id = ?`, [movieId]);
        return result.affectedRows;
    }

    /*=========================================================
        FIND GROUPED BY STATUS
    =========================================================*/
    async findGroupedByStatus(limit = 4) {
        const [rows] = await db.query(
            `
            SELECT movie_id, title, slug, movie_poster, movie_backdrop, status, age_rating, trailer_url, nation, total_likes
            FROM movies
            WHERE status != 'Ngừng chiếu'
            ORDER BY release_date DESC
            `
        );
        const nowShowing = rows.filter(movie => movie.status === 'Đang chiếu').slice(0, limit);
        const comingSoon = rows.filter(movie => movie.status === 'Sắp chiếu').slice(0, limit);
        return { 'Đang chiếu': nowShowing, 'Sắp chiếu': comingSoon };
    }

    /*=========================================================
        INCREMENT LIKES
    =========================================================*/
    async incrementLikes(movieId) {
        const [result] = await db.query(
            `UPDATE movies SET total_likes = total_likes + 1 WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        INCREMENT VIEWS
    =========================================================*/
    async incrementViews(movieId) {
        const [result] = await db.query(
            `UPDATE movies SET views_count = views_count + 1 WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        FIND BY STATUS (có phân trang + search)
    =========================================================*/
    async findByStatus(status, page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let searchClause = "";
        const queryParams = [status];

        if (search) {
            searchClause = `
                AND (
                    m.title LIKE ?
                    OR m.director LIKE ?
                    OR m.nation LIKE ?
                )
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `
            SELECT
                m.movie_id,
                m.title,
                m.slug,
                m.movie_poster,
                m.movie_backdrop,
                m.status,
                m.age_rating,
                m.release_date,
                m.duration,
                m.trailer_url,
                m.nation,
                m.total_likes,
                IFNULL(ROUND(AVG(r.rating_score), 1), 0) AS average_rating
            FROM movies m
            LEFT JOIN reviews r ON m.movie_id = r.movie_id
            WHERE m.status = ?
            ${searchClause}
            GROUP BY m.movie_id
            ORDER BY m.release_date DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM movies m
            WHERE m.status = ?
            ${searchClause}
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

    /*=========================================================
        FIND BY GENRE (có phân trang + search)
    =========================================================*/
    async findByGenre(genreSlug, page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        const params = [];

        let dataSql = `
            SELECT DISTINCT
                m.movie_id,
                m.title,
                m.slug,
                m.movie_poster,
                m.status,
                m.age_rating,
                m.release_date,
                m.director,
                m.nation,
                m.created_at
            FROM movies m
        `;
        let countSql = `
            SELECT COUNT(DISTINCT m.movie_id) AS total
            FROM movies m
        `;

        if (genreSlug) {
            dataSql += `
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.genre_id
            `;
            countSql += `
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.genre_id
            `;
            params.push(genreSlug);
        }

        let whereClause = genreSlug ? `WHERE g.slug = ?` : `WHERE 1=1`;
        const whereParams = [...params];

        if (search) {
            const keyword = `%${search}%`;
            whereClause += `
                AND (
                    m.title LIKE ?
                    OR m.director LIKE ?
                    OR m.nation LIKE ?
                )
            `;
            whereParams.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        dataSql += ` ${whereClause} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        countSql += ` ${whereClause}`;

        const [rows] = await db.query(dataSql, [...whereParams, limit, offset]);
        const [countRows] = await db.query(countSql, whereParams);

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
}

module.exports = new MovieRepository();
const db = require('../Config/db');

class MovieRepository {

    /*=========================================================
        FIND ALL MOVIES - KHÔNG PHÂN TRANG
        RETURN: rows[]
    =========================================================*/
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";
        const conditions = [];
        const queryParams = [];

        if (search) {
            conditions.push("(title LIKE ? OR director LIKE ? OR nation LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(
            `
            SELECT
                movie_id,
                title,
                slug,
                description,
                director,
                nation,
                duration,
                age_rating,
                movie_poster,
                movie_backdrop,
                trailer_url,
                release_date,
                status,
                total_likes,
                views_count,
                created_at,
                updated_at
            FROM movies
            ${whereClause}
            ORDER BY movie_id DESC
            `,
            queryParams
        );

        return rows;
    }

    /*=========================================================
        FIND ALL MOVIES - CÓ PHÂN TRANG
        RETURN: { data: [], pagination: {} }
    =========================================================*/
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
            conditions.push("(title LIKE ? OR director LIKE ? OR nation LIKE ?)");
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                movie_id,
                title,
                slug,
                description,
                director,
                nation,
                duration,
                age_rating,
                movie_poster,
                movie_backdrop,
                trailer_url,
                release_date,
                status,
                total_likes,
                views_count,
                created_at,
                updated_at
            FROM movies
            ${whereClause}
            ORDER BY movie_id DESC
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
            `
            SELECT
                movie_id,
                title,
                slug,
                description,
                director,
                nation,
                duration,
                age_rating,
                movie_poster,
                movie_backdrop,
                trailer_url,
                release_date,
                status,
                total_likes,
                views_count,
                created_at,
                updated_at
            FROM movies
            WHERE movie_id = ?
            LIMIT 1
            `,
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
            SELECT g.genre_id, g.genre_name, g.slug
            FROM genres g
            INNER JOIN movie_genres mg ON g.genre_id = mg.genre_id
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
            INNER JOIN movie_actors ma ON a.actor_id = ma.actor_id
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
            INNER JOIN rooms r ON s.room_id = r.room_id
            INNER JOIN cinemas c ON r.cinema_id = c.cinema_id
            WHERE s.movie_id = ?
                AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId]
        );
        return rows;
    }

    /*=========================================================
        CREATE MOVIE
    =========================================================*/
    async create(movieData) {
        const {
            title,
            slug,
            description,
            director,
            nation,
            duration,
            age_rating,
            movie_poster,
            movie_backdrop,
            trailer_url,
            release_date,
            status
        } = movieData;

        const [result] = await db.query(
            `
            INSERT INTO movies (
                title, slug, description, director, nation,
                duration, age_rating, movie_poster, movie_backdrop,
                trailer_url, release_date, status, total_likes, views_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
            `,
            [
                title,
                slug,
                description || "",
                director,
                nation,
                duration,
                age_rating,
                movie_poster || null,
                movie_backdrop || null,
                trailer_url || null,
                release_date,
                status
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE MOVIE
    =========================================================*/
    async update(movieId, movieData) {
        const {
            title,
            slug,
            director,
            nation,
            duration,
            age_rating,
            release_date,
            status,
            description,
            movie_poster,
            movie_backdrop,
            trailer_url
        } = movieData;

        const [result] = await db.query(
            `
            UPDATE movies
            SET
                title = ?,
                slug = ?,
                director = ?,
                nation = ?,
                duration = ?,
                age_rating = ?,
                release_date = ?,
                status = ?,
                description = ?,
                movie_poster = ?,
                movie_backdrop = ?,
                trailer_url = ?
            WHERE movie_id = ?
            `,
            [
                title,
                slug,
                director,
                nation,
                duration,
                age_rating,
                release_date,
                status,
                description || "",
                movie_poster,
                movie_backdrop,
                trailer_url || null,
                movieId
            ]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE MOVIE
    =========================================================*/
    async delete(movieId) {
        const [result] = await db.query(
            `DELETE FROM movies WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        FIND GROUPED BY STATUS
    =========================================================*/
    async findGroupedByStatus(limit = 4) {
        const [rows] = await db.query(
            `
            SELECT
                movie_id,
                title,
                slug,
                movie_poster,
                movie_backdrop,
                status,
                age_rating,
                trailer_url,
                nation,
                total_likes,
                views_count
            FROM movies
            WHERE status != 'Ngừng chiếu'
            ORDER BY release_date DESC
            `
        );

        const nowShowing = rows.filter(m => m.status === 'Đang chiếu').slice(0, limit);
        const comingSoon = rows.filter(m => m.status === 'Sắp chiếu').slice(0, limit);

        return {
            'Đang chiếu': nowShowing,
            'Sắp chiếu': comingSoon
        };
    }

    /*=========================================================
        FIND BY STATUS
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
                AND (m.title LIKE ? OR m.director LIKE ? OR m.nation LIKE ?)
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
                m.views_count,
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
        FIND BY GENRE
    =========================================================*/
    async findByGenre(genreSlug, page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";

        let whereClause = genreSlug ? `WHERE g.slug = ?` : `WHERE 1=1`;
        const params = genreSlug ? [genreSlug] : [];

        if (search) {
            const keyword = `%${search}%`;
            whereClause += ` AND (m.title LIKE ? OR m.director LIKE ? OR m.nation LIKE ?)`;
            params.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        const dataSql = `
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
            ${genreSlug ? `INNER JOIN movie_genres mg ON m.movie_id = mg.movie_id
            INNER JOIN genres g ON mg.genre_id = g.genre_id` : ''}
            ${whereClause}
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(DISTINCT m.movie_id) AS total
            FROM movies m
            ${genreSlug ? `INNER JOIN movie_genres mg ON m.movie_id = mg.movie_id
            INNER JOIN genres g ON mg.genre_id = g.genre_id` : ''}
            ${whereClause}
        `;

        const [rows] = await db.query(dataSql, [...params, limit, offset]);
        const [countRows] = await db.query(countSql, params);

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
}

module.exports = new MovieRepository();
// repositories/MovieRepository.js
const db = require('../Config/db');

class MovieRepository {
    // Lấy tất cả phim
    async findAll() {
        const [rows] = await db.query(
            `SELECT * FROM movies ORDER BY created_at DESC`
        );
        return rows;
    }

    // Lấy phim theo ID
    async findById(movieId) {
        const [rows] = await db.query(
            `SELECT * FROM movies WHERE movie_id = ?`,
            [movieId]
        );
        return rows[0] || null;
    }

    // Lấy phim theo slug (kèm genres, actors, showtimes)
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
            `,
            [slug]
        );
        return rows[0] || null;
    }

    // Lấy genres của phim
    async getGenresByMovieId(movieId) {
        const [rows] = await db.query(
            `SELECT g.genre_id, g.genre_name
             FROM genres g
             JOIN movie_genres mg ON g.genre_id = mg.genre_id
             WHERE mg.movie_id = ?`,
            [movieId]
        );
        return rows;
    }

    // Lấy actors của phim
    async getActorsByMovieId(movieId) {
        const [rows] = await db.query(
            `SELECT a.actor_id, a.name, a.actor_avatar, a.slug
             FROM actors a
             JOIN movie_actors ma ON a.actor_id = ma.actor_id
             WHERE ma.movie_id = ?`,
            [movieId]
        );
        return rows;
    }

    // Lấy showtimes của phim (chỉ những suất chưa chiếu)
    async getShowtimesByMovieId(movieId) {
        const [rows] = await db.query(
            `
            SELECT s.showtime_id, s.start_time,
                   r.room_name, r.room_type,
                   c.cinema_name, c.address
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
    // Tạo phim mới
    async create(movieData) {
        const {
            title, slug, description, director, nation,
            duration, age_rating, movie_poster, movie_backdrop,
            trailer_url, release_date, status, total_likes
        } = movieData;

        const [result] = await db.query(
            `
            INSERT INTO movies (
                title, slug, description, director, nation,
                duration, age_rating, movie_poster, movie_backdrop,
                trailer_url, release_date, status, total_likes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                title, slug, description || "", director, nation,
                duration, age_rating, movie_poster || null, movie_backdrop || null,
                trailer_url || null, release_date, status, total_likes || 0
            ]
        );
        return result.insertId;
    }

    // Cập nhật phim
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
                trailer_url = ?,
                total_likes = ?
            WHERE movie_id = ?
            `,
            [
                title, slug, director, nation, duration, age_rating,
                release_date, status, description || "",
                movie_poster, movie_backdrop, trailer_url || null,
                total_likes || 0, movieId
            ]
        );
        return result.affectedRows;
    }

    // Xóa phim
    async delete(movieId) {
        const [result] = await db.query(
            `DELETE FROM movies WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    // Lấy phim theo status group (Đang chiếu, Sắp chiếu - mỗi loại 4 phim)
    async findGroupedByStatus(limit = 4) {
        const [rows] = await db.query(
            `
            SELECT
                movie_id, title, slug, movie_poster, movie_backdrop,
                status, age_rating, trailer_url, nation, total_likes
            FROM movies
            WHERE status != 'Ngừng chiếu'
            ORDER BY release_date DESC
            `
        );
        // Group và slice
        const nowShowing = rows.filter(m => m.status === 'Đang chiếu').slice(0, limit);
        const comingSoon = rows.filter(m => m.status === 'Sắp chiếu').slice(0, limit);
        return { 'Đang chiếu': nowShowing, 'Sắp chiếu': comingSoon };
    }

    // Lấy phim theo status (có avg rating)
    async findByStatus(status) {
        const [rows] = await db.query(
            `
            SELECT
                m.movie_id, m.title, m.slug, m.movie_poster, m.movie_backdrop,
                m.status, m.age_rating, m.release_date, m.duration, m.trailer_url,
                m.nation, m.total_likes,
                IFNULL(ROUND(AVG(r.rating_score), 1), 0) AS average_rating
            FROM movies m
            LEFT JOIN reviews r ON m.movie_id = r.movie_id
            WHERE m.status = ?
            GROUP BY m.movie_id
            ORDER BY m.release_date DESC
            `,
            [status]
        );
        return rows;
    }

    // Tăng likes
    async incrementLikes(movieId) {
        const [result] = await db.query(
            `UPDATE movies SET total_likes = total_likes + 1 WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    // Tăng views
    async incrementViews(movieId) {
        const [result] = await db.query(
            `UPDATE movies SET views_count = views_count + 1 WHERE movie_id = ?`,
            [movieId]
        );
        return result.affectedRows;
    }

    // Lấy phim theo genre slug
    async findByGenre(genreSlug) {
        let sql = `
            SELECT DISTINCT
                m.movie_id, m.title, m.slug, m.movie_poster,
                m.status, m.age_rating, m.release_date, m.created_at
            FROM movies m
        `;
        const params = [];
        if (genreSlug) {
            sql += `
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.genre_id
                WHERE g.slug = ?
            `;
            params.push(genreSlug);
        }
        sql += ` ORDER BY m.created_at DESC`;
        const [rows] = await db.query(sql, params);
        return rows;
    }
}

module.exports = new MovieRepository();
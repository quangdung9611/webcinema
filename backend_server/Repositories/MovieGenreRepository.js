const db = require('../Config/db');

class MovieGenreRepository {

    /*=========================================================
        FIND GENRE IDS BY MOVIE ID
        RETURN: number[]
    =========================================================*/
    async findGenreIdsByMovieId(movieId) {
        const [rows] = await db.query(
            "SELECT genre_id FROM movie_genres WHERE movie_id = ?",
            [movieId]
        );
        return rows.map(row => row.genre_id);
    }

    /*=========================================================
        FIND ALL ASSIGNMENTS (GỘP TẤT CẢ PHIM)
        RETURN: [{ movie_id, genre_ids: [] }]
    =========================================================*/
    async findAllAssignments() {
        const [rows] = await db.query(
            `
            SELECT 
                movie_id, 
                GROUP_CONCAT(genre_id) as genre_ids
            FROM movie_genres
            GROUP BY movie_id
            `
        );
        
        return rows.map(row => ({
            movie_id: row.movie_id,
            genre_ids: row.genre_ids ? row.genre_ids.split(',').map(Number) : []
        }));
    }

    /*=========================================================
        UPDATE MOVIE GENRES (XÓA CŨ + CHÈN MỚI)
    =========================================================*/
    async updateMovieGenres(movieId, genreIds) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Xóa cũ
            await connection.query(
                "DELETE FROM movie_genres WHERE movie_id = ?",
                [movieId]
            );

            // 2. Chèn mới nếu có
            if (genreIds && Array.isArray(genreIds) && genreIds.length > 0) {
                const values = genreIds.map(gId => [movieId, gId]);
                await connection.query(
                    "INSERT INTO movie_genres (movie_id, genre_id) VALUES ?",
                    [values]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new MovieGenreRepository();
const db = require('../Config/db');

class MovieGenreRepository {

    /* =========================================================
        Lấy tất cả các cặp (movie_id, danh sách genre_id)
        RETURN: [{ movie_id, genre_ids: [] }]
    ========================================================= */
    async findAllAssignments() {
        console.log('🔍 [findAllAssignments] Bắt đầu query...');
        try {
            const [rows] = await db.query(`
                SELECT 
                    movie_id, 
                    GROUP_CONCAT(genre_id ORDER BY genre_id ASC) as genre_ids
                FROM movie_genres
                GROUP BY movie_id
            `);
            console.log('📊 [findAllAssignments] Số dòng trả về:', rows.length);
            const result = rows.map(row => ({
                movie_id: row.movie_id,
                genre_ids: row.genre_ids ? row.genre_ids.split(',').map(Number) : []
            }));
            console.log('✅ [findAllAssignments] Kết quả:', JSON.stringify(result));
            return result;
        } catch (error) {
            console.error('❌ [findAllAssignments] Lỗi SQL:', error);
            throw error;
        }
    }

    /* =========================================================
        Lấy danh sách genre_id của một phim
        RETURN: number[]
    ========================================================= */
    async findGenreIdsByMovieId(movieId) {
        const [rows] = await db.query(
            'SELECT genre_id FROM movie_genres WHERE movie_id = ?',
            [movieId]
        );
        return rows.map(row => row.genre_id);
    }

    /* =========================================================
        Cập nhật thể loại cho phim (transaction)
    ========================================================= */
    async updateMovieGenres(movieId, genreIds) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Xóa cũ
            await connection.query(
                'DELETE FROM movie_genres WHERE movie_id = ?',
                [movieId]
            );

            // Chèn mới nếu có
            if (genreIds && Array.isArray(genreIds) && genreIds.length > 0) {
                const values = genreIds.map(gId => [movieId, gId]);
                await connection.query(
                    'INSERT INTO movie_genres (movie_id, genre_id) VALUES ?',
                    [values]
                );
            }

            await connection.commit();
            console.log(`✅ [updateMovieGenres] Cập nhật thành công cho movie_id=${movieId}`);
        } catch (error) {
            await connection.rollback();
            console.error('❌ [updateMovieGenres] Lỗi:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new MovieGenreRepository();
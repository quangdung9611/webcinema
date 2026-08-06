const db = require('../Config/db');

class MovieActorRepository {

    /*=========================================================
        FIND ACTOR IDS BY MOVIE ID
        RETURN: number[]
    =========================================================*/
    async findActorIdsByMovieId(movieId) {
        const [rows] = await db.query(
            "SELECT actor_id FROM movie_actors WHERE movie_id = ?",
            [movieId]
        );
        return rows.map(row => row.actor_id);
    }

    /*=========================================================
        FIND ALL ASSIGNMENTS (GỘP TẤT CẢ PHIM)
        RETURN: [{ movie_id, actor_ids: [] }]
    =========================================================*/
    async findAllAssignments() {
        const [rows] = await db.query(
            `
            SELECT 
                movie_id, 
                GROUP_CONCAT(actor_id) as actor_ids
            FROM movie_actors
            GROUP BY movie_id
            `
        );
        
        return rows.map(row => ({
            movie_id: row.movie_id,
            actor_ids: row.actor_ids ? row.actor_ids.split(',').map(Number) : []
        }));
    }

    /*=========================================================
        UPDATE MOVIE ACTORS (XÓA CŨ + CHÈN MỚI)
    =========================================================*/
    async updateMovieActors(movieId, actorIds) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Xóa cũ
            await connection.query(
                "DELETE FROM movie_actors WHERE movie_id = ?",
                [movieId]
            );

            // 2. Chèn mới nếu có
            if (actorIds && Array.isArray(actorIds) && actorIds.length > 0) {
                const values = actorIds.map(aId => [movieId, aId]);
                await connection.query(
                    "INSERT INTO movie_actors (movie_id, actor_id) VALUES ?",
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

module.exports = new MovieActorRepository();
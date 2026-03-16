const db = require('../Config/db');

/**
 * Lấy danh sách ID các diễn viên mà một bộ phim đang có
 * GET /api/movie-actors/:movie_id
 */
exports.getActorsByMovieId = async (req, res) => {
    const { movie_id } = req.params;
    try {
        const [rows] = await db.query(
            "SELECT actor_id FROM movie_actors WHERE movie_id = ?", 
            [movie_id]
        );
        // Trả về mảng ID: [1, 2, 8] để Frontend check vào checkbox/select
        const actorIds = rows.map(row => row.actor_id);
        res.status(200).json(actorIds);
    } catch (error) {
        console.error("Lỗi getActorsByMovieId:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách ID diễn viên của phim." });
    }
};

/**
 * Cập nhật (Gán) danh sách diễn viên cho phim
 * POST /api/movie-actors/update
 */
exports.updateMovieActors = async (req, res) => {
    const { movie_id, actor_ids } = req.body; // actor_ids là mảng [1, 8, 9]

    if (!movie_id) {
        return res.status(400).json({ error: "Thiếu ID phim rồi Dũng ơi." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Bước 1: Xóa sạch các liên kết diễn viên cũ của phim này
        await connection.query(
            "DELETE FROM movie_actors WHERE movie_id = ?", 
            [movie_id]
        );

        // Bước 2: Chèn danh sách diễn viên mới (nếu có chọn)
        if (actor_ids && Array.isArray(actor_ids) && actor_ids.length > 0) {
            // Chuẩn bị dữ liệu cho câu lệnh INSERT (dạng mảng các mảng con)
            const values = actor_ids.map(a_id => [movie_id, a_id]);

            const insertSql = "INSERT INTO movie_actors (movie_id, actor_id) VALUES ?";
            await connection.query(insertSql, [values]);
        }

        await connection.commit();
        res.status(200).json({ message: "Cập nhật danh sách diễn viên thành công!" });

    } catch (error) {
        await connection.rollback();
        console.error("Lỗi updateMovieActors:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật diễn viên." });
    } finally {
        connection.release();
    }
};

/**
 * Lấy tất cả các cặp gán Phim - Diễn viên cho trang danh sách Admin
 * GET /api/movie-actors/all-assignments
 */
exports.getAllAssignments = async (req, res) => {
    try {
        // Sử dụng GROUP_CONCAT để gộp các actor_id thành một chuỗi cho mỗi phim
        const sql = `
            SELECT movie_id, GROUP_CONCAT(actor_id) as actor_ids 
            FROM movie_actors 
            GROUP BY movie_id
        `;
        const [rows] = await db.query(sql);

        // Chuyển chuỗi "1,2" thành mảng số [1, 2] để Frontend dễ xử lý
        const formattedRows = rows.map(row => ({
            movie_id: row.movie_id,
            actor_ids: row.actor_ids ? row.actor_ids.split(',').map(Number) : []
        }));

        res.status(200).json(formattedRows);
    } catch (error) {
        console.error("Lỗi tại getAllAssignments (Actors):", error);
        res.status(500).json({ 
            error: "Lỗi hệ thống.",
            detail: error.message 
        });
    }
};
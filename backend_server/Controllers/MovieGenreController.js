const db = require('../Config/db');

/**
 * Lấy danh sách ID các thể loại mà một bộ phim đang có
 * GET /api/movie-genres/:movie_id
 */
exports.getGenresByMovieId = async (req, res) => {
    const { movie_id } = req.params;
    try {
        const [rows] = await db.query(
            "SELECT genre_id FROM movie_genres WHERE movie_id = ?", 
            [movie_id]
        );
        // Trả về mảng ID: [1, 2, 8] để Frontend check vào checkbox
        const genreIds = rows.map(row => row.genre_id);
        res.status(200).json(genreIds);
    } catch (error) {
        console.error("Lỗi getGenresByMovieId:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách thể loại của phim." });
    }
};

/**
 * Cập nhật (Gán) thể loại cho phim
 * POST /api/movie-genres/update
 */
exports.updateMovieGenres = async (req, res) => {
    const { movie_id, genre_ids } = req.body; // genre_ids là mảng [1, 8, 9]

    if (!movie_id) {
        return res.status(400).json({ error: "Thiếu ID phim." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Bước 1: Xóa sạch các thể loại cũ của phim này
        await connection.query(
            "DELETE FROM movie_genres WHERE movie_id = ?", 
            [movie_id]
        );

        // Bước 2: Chèn các thể loại mới (nếu có chọn)
        if (genre_ids && Array.isArray(genre_ids) && genre_ids.length > 0) {
            // Chuẩn bị dữ liệu cho câu lệnh INSERT (dạng mảng các mảng con)
            const values = genre_ids.map(g_id => [movie_id, g_id]);

            const insertSql = "INSERT INTO movie_genres (movie_id, genre_id) VALUES ?";
            await connection.query(insertSql, [values]);
        }

        await connection.commit();
        res.status(200).json({ message: "Cập nhật thể loại cho phim thành công!" });

    } catch (error) {
        await connection.rollback();
        console.error("Lỗi updateMovieGenres:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi cập nhật thể loại." });
    } finally {
        connection.release();
    }
};
exports.getAllAssignments = async (req, res) => {
    try {
        // Sử dụng GROUP_CONCAT để gộp các genre_id thành một chuỗi "5,7" cho phim ID 5
        const sql = `
            SELECT movie_id, GROUP_CONCAT(genre_id) as genre_ids 
            FROM movie_genres 
            GROUP BY movie_id
        `;
        const [rows] = await db.query(sql);

        // Chuyển chuỗi "5,7" thành mảng [5, 7] để Frontend dễ xử lý
        const formattedRows = rows.map(row => ({
            movie_id: row.movie_id,
            genre_ids: row.genre_ids ? row.genre_ids.split(',').map(Number) : []
        }));

        res.status(200).json(formattedRows);
    } catch (error) {
        console.error("Lỗi tại getAllAssignments:", error);
        res.status(500).json({ 
            error: "Lỗi hệ thống.",
            detail: error.message 
        });
    }
};
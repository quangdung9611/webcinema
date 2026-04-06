const db = require('../Config/db'); 

const ReviewController = {
    // 1. Gửi bình luận: Ép giờ Việt Nam bất chấp cấu hình server
    sendReview: async (req, res) => {
        try {
            const { movie_id, user_id, rating, comment } = req.body;

            if (!movie_id || !user_id || !rating) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Dũng ơi, thiếu thông tin phim, người dùng hoặc điểm rồi!" 
                });
            }

            // --- FIX GIỜ VIỆT NAM TẠI ĐÂY ---
            // Dùng sv-SE để MySQL nhận diện đúng định dạng DATETIME
            const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

            const sql = `
                INSERT INTO reviews (movie_id, user_id, rating_score, comment, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            // Truyền 'nowVN' vào cả created_at và updated_at
            await db.query(sql, [movie_id, user_id, rating, comment, nowVN, nowVN]);
            
            return res.status(200).json({ 
                success: true, 
                message: "Đánh giá của bạn đã được lưu lại thành công!" 
            });

        } catch (error) {
            console.error("❌ [DŨNG] Lỗi gửi bình luận:", error.message);
            return res.status(500).json({ 
                success: false, 
                message: "Lỗi hệ thống: " + error.message 
            });
        }
    },

    // 2. Lấy danh sách bình luận (Sắp xếp theo mới nhất)
    getReviewsByMovie: async (req, res) => {
        try {
            const { movie_id } = req.params;

            const sql = `
                SELECT 
                    r.review_id,
                    r.movie_id,
                    r.user_id,
                    r.rating_score,
                    r.comment,
                    DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
                    u.username, 
                    u.full_name,
                    IFNULL(u.full_name, u.username) AS display_name 
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.movie_id = ?
                ORDER BY r.created_at DESC
            `;

            const [results] = await db.query(sql, [movie_id]);
            
            return res.status(200).json(results);

        } catch (error) {
            console.error("❌ [DŨNG] Lỗi lấy bình luận:", error.message);
            return res.status(200).json([]); 
        }
    }
};

module.exports = ReviewController;
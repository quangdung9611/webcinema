const db = require('../Config/db'); 

const ReviewController = {
    // Gửi bình luận mới hoàn toàn (Lưu lịch sử lần 1, lần 2, lần 3...)
    sendReview: async (req, res) => {
        try {
            const { movie_id, user_id, rating, comment } = req.body;

            if (!movie_id || !user_id || !rating) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Thiếu thông tin đánh giá rồi Dũng ơi!" 
                });
            }

            // Dùng INSERT thuần để mỗi lần là 1 dòng mới
            // created_at và updated_at đều lấy giờ hiện tại (NOW())
            const sql = `
                INSERT INTO reviews (movie_id, user_id, rating_score, comment, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `;

            await db.promise().query(sql, [movie_id, user_id, rating, comment]);
            
            return res.status(200).json({ 
                success: true, 
                message: "Đánh giá của bạn đã được lưu lại!" 
            });

        } catch (error) {
            console.error("❌ Lỗi gửi bình luận:", error.message);
            return res.status(500).json({ 
                success: false, 
                message: "Lỗi hệ thống: " + error.message 
            });
        }
    },

    // Lấy danh sách bình luận kèm ngày giờ định dạng Việt Nam
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
                    -- Định dạng ngày giờ: Ngày/Tháng/Năm Giờ:Phút
                    DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
                    u.username, 
                    u.full_name,
                    IFNULL(u.full_name, u.username) AS display_name 
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.movie_id = ?
                ORDER BY r.created_at DESC
            `;

            const [results] = await db.promise().query(sql, [movie_id]);
            return res.status(200).json(results);

        } catch (error) {
            console.error("❌ Lỗi lấy bình luận:", error.message);
            return res.status(200).json([]); 
        }
    }
};

module.exports = ReviewController;
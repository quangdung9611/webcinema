const db = require('../Config/db'); 

const ReviewController = {
    // Gửi bình luận (Thêm mới hoặc Chỉnh sửa)
    sendReview: async (req, res) => {
        try {
            const { movie_id, user_id, rating, comment } = req.body;

            // Kiểm tra dữ liệu đầu vào cơ bản
            if (!movie_id || !user_id || !rating) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Dũng ơi, thiếu movie_id, user_id hoặc điểm đánh giá rồi!" 
                });
            }

            // Câu lệnh SQL với cơ chế ON DUPLICATE KEY UPDATE
            // Nếu cặp (movie_id, user_id) đã tồn tại trong bản UNIQUE INDEX, nó sẽ chạy phần UPDATE
            const sql = `
                INSERT INTO reviews (movie_id, user_id, rating_score, comment, created_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    rating_score = VALUES(rating_score), 
                    comment = VALUES(comment), 
                    updated_at = NOW()
            `;

            // Dùng db.promise() để đợi kết quả từ MySQL
            await db.promise().query(sql, [movie_id, user_id, rating, comment]);
            
            return res.status(200).json({ 
                success: true, 
                message: "Đánh giá của bạn đã được ghi nhận thành công!" 
            });

        } catch (error) {
            console.error("❌ Lỗi Controller Review:", error.message);
            return res.status(500).json({ 
                success: false, 
                message: "Lỗi hệ thống, không thể lưu bình luận lúc này!" 
            });
        }
    },

    getReviewsByMovie: async (req, res) => {
    try {
        const { movie_id } = req.params;

        // SQL giữ nguyên là chuẩn rồi
        const sql = `
            SELECT 
                r.*, 
                u.username, 
                u.full_name,
                IFNULL(u.full_name, u.username) AS display_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.movie_id = ?
            ORDER BY r.created_at DESC
        `;

        const [results] = await db.promise().query(sql, [movie_id]);
        
        // Luôn trả về results. Nếu không có dòng nào, kết quả tự động là []
        return res.status(200).json(results);

    } catch (error) {
        console.error("❌ Lỗi lấy bình luận:", error.message);
        
        // Nếu lỗi là do chưa có bảng, trả về mảng rỗng để Frontend không bị crash
        // Nhưng tốt nhất là Dũng phải chạy lệnh CREATE TABLE nhé!
        return res.status(200).json([]); 
    }
}
    
};

module.exports = ReviewController;
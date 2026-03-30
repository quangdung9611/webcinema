const db = require('../Config/db'); 

const ReviewController = {
    // Gửi bình luận: Mỗi lần gửi tạo 1 dòng mới (Lưu lịch sử)
    sendReview: async (req, res) => {
        try {
            const { movie_id, user_id, rating, comment } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!movie_id || !user_id || !rating) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Dũng ơi, thiếu thông tin phim, người dùng hoặc điểm rồi!" 
                });
            }

            // Dùng INSERT thuần để lưu nhiều lần. 
            // BỎ .promise() vì file db.js của bạn đã là promise-based rồi.
            const sql = `
                INSERT INTO reviews (movie_id, user_id, rating_score, comment, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `;

            await db.query(sql, [movie_id, user_id, rating, comment]);
            
            return res.status(200).json({ 
                success: true, 
                message: "Đánh giá của bạn đã được lưu lại thành công!" 
            });

        } catch (error) {
            // Log lỗi chi tiết ra console của Render để Dũng dễ debug
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

            // Lấy dữ liệu và định dạng ngày tháng ngay từ câu SQL
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

            // BỎ .promise() ở đây luôn
            const [results] = await db.query(sql, [movie_id]);
            
            return res.status(200).json(results);

        } catch (error) {
            console.error("❌ Lỗi lấy bình luận:", error.message);
            // Trả về mảng rỗng thay vì lỗi 500 để giao diện không bị trắng xóa
            return res.status(200).json([]); 
        }
    }
};

module.exports = ReviewController;
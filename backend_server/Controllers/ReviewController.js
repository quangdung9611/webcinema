const db = require('../Config/db'); 

const ReviewController = {
    // 1. Gửi bình luận mới (Hoặc cập nhật nếu đã có)
    sendReview: async (req, res) => {
        try {
            // Nhận trực tiếp mọi thứ từ Frontend gửi lên
            const { movie_id, user_id, rating, comment } = req.body;

            if (!movie_id || !user_id) {
                return res.status(400).json({ message: "Thiếu movie_id hoặc user_id rồi!" });
            }

            const sql = `
                INSERT INTO reviews (movie_id, user_id, rating_score, comment, created_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    rating_score = VALUES(rating_score), 
                    comment = VALUES(comment), 
                    created_at = NOW()
            `;

            db.query(sql, [movie_id, user_id, rating, comment], (err, result) => {
                if (err) {
                    console.error("Lỗi SQL:", err);
                    return res.status(500).json({ message: "Lỗi lưu đánh giá!" });
                }
                res.status(200).json({ message: "Gửi đánh giá thành công!" });
            });
        } catch (error) {
            res.status(500).json({ message: "Lỗi hệ thống!" });
        }
    },

    // 2. Lấy danh sách bình luận của một bộ phim
    getReviewsByMovie: async (req, res) => {
        try {
            const { movie_id } = req.params;

            // Câu lệnh SQL này lấy cả tên User (từ bảng users) để hiển thị cho đẹp
            const sql = `
                转换 SELECT r.*, u.full_name 
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.movie_id = ?
                ORDER BY r.created_at DESC
            `;

            db.query(sql, [movie_id], (err, results) => {
                if (err) {
                    console.error("Lỗi lấy danh sách review:", err);
                    return res.status(500).json({ message: "Không lấy được danh sách bình luận!" });
                }
                res.status(200).json(results);
            });
        } catch (error) {
            res.status(500).json({ message: "Lỗi hệ thống!" });
        }
    }
};

module.exports = ReviewController;
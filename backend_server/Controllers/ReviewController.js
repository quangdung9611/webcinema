const db = require('../Config/db'); 
const jwt = require('jsonwebtoken');

// Lấy đúng SECRET_KEY y hệt bên AuthController của ông
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

const ReviewController = {
    sendReview: async (req, res) => {
        try {
            const { movie_id, rating, comment } = req.body;
            
            // 1. Lấy token từ header (Frontend gửi: Bearer <token>)
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: "Dũng ơi, hệ thống không tìm thấy token đăng nhập!" });
            }

            // 2. Dùng SECRET_KEY để giải mã token
            jwt.verify(token, SECRET_KEY, (err, decoded) => {
                if (err) {
                    console.error("JWT Verify Error:", err.message);
                    return res.status(403).json({ message: "Phiên làm việc hết hạn hoặc token không hợp lệ" });
                }
                
                /**
                 * TRỌNG TÂM: Khớp biến id
                 * Bên AuthController ông viết: { id: user.user_id }
                 * Nên ở đây phải lấy: decoded.id
                 */
                const user_id = decoded.id; 

                // 3. Thực hiện câu lệnh SQL
                // Sử dụng ON DUPLICATE KEY UPDATE để cho phép user sửa đánh giá của chính mình
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
                        console.error("Lỗi MySQL:", err);
                        return res.status(500).json({ message: "Lỗi lưu vào database rồi Dũng ơi!" });
                    }
                    res.status(200).json({ message: "Đánh giá thành công! Dữ liệu đã được cập nhật." });
                });
            });
        } catch (error) {
            console.error("Lỗi Server:", error);
            res.status(500).json({ message: "Lỗi hệ thống nghiêm trọng" });
        }
    }
};

module.exports = ReviewController;
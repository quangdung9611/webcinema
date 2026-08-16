const db = require("../Config/db");

class ReviewRepository {

    // ==========================================================
    // TẠO REVIEW
    // ==========================================================
    async create(data) {
        const {
            movie_id,
            user_id,
            rating_score,
            comment
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO reviews
            (movie_id, user_id, rating_score, comment)
            VALUES (?, ?, ?, ?)
            `,
            [movie_id, user_id, rating_score, comment || null]
        );

        return result.insertId;
    }


    // ==========================================================
    // LẤY REVIEW THEO PHIM - CÓ PHÂN TRANG
    // ==========================================================
    async findByMovie(movieId, page = 1, limit = 20) {

        // Chuẩn hóa page
        page = Number.parseInt(page, 10);
        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        // Chuẩn hóa limit
        limit = Number.parseInt(limit, 10);
        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }
        if (limit > 100) {
            limit = 100;
        }

        const offset = (page - 1) * limit;

        // Lấy danh sách review
        const [rows] = await db.query(
            `
            SELECT
                r.review_id,
                r.movie_id,
                r.user_id,
                r.rating_score,
                r.comment,
                DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
                u.username,
                u.full_name,
                IFNULL(u.full_name, u.username) AS display_name,
                u.user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.movie_id = ?
            ORDER BY r.created_at DESC, r.review_id DESC
            LIMIT ? OFFSET ?
            `,
            [movieId, limit, offset]
        );

        // Đếm tổng số review
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM reviews
            WHERE movie_id = ?
            `,
            [movieId]
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit);

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }


    // ==========================================================
    // KIỂM TRA USER ĐÃ REVIEW PHIM CHƯA
    // ==========================================================
    async findByUserAndMovie(userId, movieId) {
        const [rows] = await db.query(
            `
            SELECT review_id
            FROM reviews
            WHERE user_id = ? AND movie_id = ?
            LIMIT 1
            `,
            [userId, movieId]
        );
        return rows[0] || null;
    }


    // ==========================================================
    // LẤY ĐIỂM ĐÁNH GIÁ TRUNG BÌNH
    // ==========================================================
    async getAverageRating(movieId) {
        const [rows] = await db.query(
            `
            SELECT
                IFNULL(ROUND(AVG(rating_score), 1), 0) AS avg_rating,
                COUNT(*) AS total_reviews
            FROM reviews
            WHERE movie_id = ?
            `,
            [movieId]
        );
        return rows[0];
    }
}

module.exports = new ReviewRepository();
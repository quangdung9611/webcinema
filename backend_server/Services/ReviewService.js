const ReviewRepository = require("../Repositories/ReviewRepository");

class ReviewService {

    // ==========================================================
    // TẠO REVIEW
    // ==========================================================
    async createReview(data) {
        const { movie_id, user_id, rating, comment } = data;

        // Validate rating (1-5)
        const numericRating = Number(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            const err = new Error("Điểm đánh giá phải từ 1 đến 5");
            err.statusCode = 400;
            err.field = "rating";
            throw err;
        }

        // Kiểm tra người dùng đã review phim này chưa
        const existing = await ReviewRepository.findByUserAndMovie(user_id, movie_id);
        if (existing) {
            const err = new Error("Bạn đã đánh giá phim này rồi");
            err.statusCode = 400;
            throw err;
        }

        const cleanComment = comment?.trim() || null;

        const reviewId = await ReviewRepository.create({
            movie_id,
            user_id,
            rating_score: numericRating,
            comment: cleanComment,
        });

        return reviewId;
    }


    // ==========================================================
    // LẤY DANH SÁCH REVIEW THEO PHIM (kèm phân trang)
    // Wrap kết quả thành chuẩn { success: true, data, pagination }
    // ==========================================================
    async getReviewsByMovie(movieId, page = 1, limit = 20) {
        const result = await ReviewRepository.findByMovie(movieId, page, limit);

        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }


    // ==========================================================
    // LẤY ĐIỂM TRUNG BÌNH CỦA PHIM
    // ==========================================================
    async getMovieRating(movieId) {
        const ratingData = await ReviewRepository.getAverageRating(movieId);

        return {
            success: true,
            data: ratingData,
        };
    }
}

module.exports = new ReviewService();
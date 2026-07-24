const ReviewRepository = require("../Repositories/ReviewRepository");

class ReviewService {
  async createReview(data) {
    const { movie_id, user_id, rating, comment } = data;

    // Validate rating
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      const err = new Error("Điểm đánh giá phải từ 1 đến 5");
      err.statusCode = 400;
      err.field = "rating";
      throw err;
    }

    // Check user đã review phim này chưa
    const existing = await ReviewRepository.findByUserAndMovie(user_id, movie_id);
    if (existing) {
      const err = new Error("Bạn đã đánh giá phim này rồi");
      err.statusCode = 400;
      throw err;
    }

    const cleanComment = comment?.trim() || null;

    return await ReviewRepository.create({
      movie_id,
      user_id,
      rating_score: numericRating,
      comment: cleanComment,
    });
  }

  async getReviewsByMovie(movieId) {
    return await ReviewRepository.findByMovie(movieId);
  }

  async getMovieRating(movieId) {
    return await ReviewRepository.getAverageRating(movieId);
  }
}

module.exports = new ReviewService();
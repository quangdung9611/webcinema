const ReviewService = require("../Services/ReviewService");

exports.sendReview = async (req, res) => {
  try {
    const { movie_id, rating, comment } = req.body;
    const user_id = req.user?.user_id;

    if (!movie_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin phim hoặc người dùng",
      });
    }

    const reviewId = await ReviewService.createReview({
      movie_id,
      user_id,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Đánh giá của bạn đã được lưu thành công!",
      data: { review_id: reviewId },
    });
  } catch (err) {
    console.error("Send Review Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      field: err.field || null,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getReviewsByMovie = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const data = await ReviewService.getReviewsByMovie(movie_id);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get Reviews Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getMovieRating = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const data = await ReviewService.getMovieRating(movie_id);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get Movie Rating Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
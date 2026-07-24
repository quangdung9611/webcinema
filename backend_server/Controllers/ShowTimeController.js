const ShowtimeService = require("../Services/ShowtimeService");

exports.getAllShowtimes = async (req, res) => {
  try {
    const data = await ShowtimeService.getAllShowtimes();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get all showtimes error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getShowtimeDetail = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    const data = await ShowtimeService.getShowtimeDetail(showtime_id);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get showtime detail error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getShowtimesByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const data = await ShowtimeService.getShowtimesByMovie(movieId);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get showtimes by movie error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.createShowtime = async (req, res) => {
  try {
    const showtimeId = await ShowtimeService.createShowtime(req.body);
    return res.status(201).json({
      success: true,
      message: "Thêm suất chiếu thành công",
      showtime_id: showtimeId,
    });
  } catch (err) {
    console.error("Create showtime error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      field: err.field || null,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updateShowtime = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    await ShowtimeService.updateShowtime(showtime_id, req.body);
    return res.status(200).json({
      success: true,
      message: "Cập nhật suất chiếu thành công",
    });
  } catch (err) {
    console.error("Update showtime error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      field: err.field || null,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deleteShowtime = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    await ShowtimeService.deleteShowtime(showtime_id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa suất chiếu thành công",
    });
  } catch (err) {
    console.error("Delete showtime error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getQuickBookingData = async (req, res) => {
  try {
    const { movie_id, cinema_id, date } = req.query;
    const data = await ShowtimeService.getQuickBookingData(movie_id, cinema_id, date);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Quick booking error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getShowtimesForBooking = async (req, res) => {
  try {
    const { movie_id, cinema_id, date } = req.query;
    const data = await ShowtimeService.getShowtimesForBooking(movie_id, cinema_id, date);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Booking showtime error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.filterShowtimes = async (req, res) => {
  try {
    const { movie_id, room_id, date } = req.query;
    const data = await ShowtimeService.filterShowtimes(movie_id, room_id, date);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Filter showtime error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
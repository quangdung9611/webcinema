const ShowtimeService = require("../Services/ShowtimeService");
const ShowtimeRepository = require("../Repositories/ShowtimeRepository"); // ✅ THÊM IMPORT NÀY

// -------------------- LẤY TẤT CẢ --------------------
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

// -------------------- LẤY SUẤT CHIẾU THEO RẠP + PHÒNG --------------------
exports.getShowtimesByCinemaAndRoom = async (req, res) => {
  try {
    const { cinema_id, room_id } = req.query;

    if (!cinema_id || !room_id) {
      return res.status(400).json({
        error: "Thiếu tham số cinema_id hoặc room_id",
      });
    }

    const showtimes = await ShowtimeRepository.findByCinemaAndRoom(cinema_id, room_id);
    res.status(200).json(showtimes);
  } catch (error) {
    console.error("Lỗi lấy suất chiếu theo rạp và phòng:", error);
    res.status(500).json({ error: error.message });
  }
};

// -------------------- CHI TIẾT SUẤT CHIẾU --------------------
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

// -------------------- SUẤT CHIẾU THEO PHIM --------------------
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

// -------------------- TẠO --------------------
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

// -------------------- CẬP NHẬT --------------------
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

// -------------------- XÓA --------------------
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

// -------------------- QUICK BOOKING --------------------
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

// -------------------- BOOKING FILTER --------------------
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

// -------------------- FILTER LEGACY --------------------
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
const CinemaService = require("../Services/CinemaService");

exports.getAllCinemas = async (req, res) => {
  try {
    const cinemas = await CinemaService.getAllCinemas();
    return res.status(200).json(cinemas);
  } catch (err) {
    console.error("Get all cinemas error:", err);
    return res.status(err.statusCode || 500).json({
      error: err.message || "Lỗi hệ thống khi lấy danh sách rạp"
    });
  }
};

exports.getCinemaById = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const cinema = await CinemaService.getCinemaById(cinema_id);
    return res.status(200).json(cinema);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Lỗi hệ thống"
    });
  }
};

exports.getCinemaBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const cinema = await CinemaService.getCinemaBySlug(slug);
    return res.status(200).json(cinema);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Lỗi server"
    });
  }
};

exports.createCinema = async (req, res) => {
  try {
    const cinemaId = await CinemaService.createCinema(req.body);
    return res.status(201).json({
      success: true,
      message: "Thêm rạp thành công",
      cinema_id: cinemaId
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      field: err.field || null,
      error: err.message || "Lỗi hệ thống khi tạo rạp"
    });
  }
};

exports.updateCinema = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    await CinemaService.updateCinema(cinema_id, req.body);
    return res.status(200).json({
      success: true,
      message: "Cập nhật rạp thành công!"
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      field: err.field || null,
      error: err.message || "Lỗi hệ thống khi cập nhật rạp"
    });
  }
};

exports.deleteCinema = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    await CinemaService.deleteCinema(cinema_id);
    return res.status(200).json({
      success: true,
      message: "Xóa rạp thành công"
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Không thể xóa rạp"
    });
  }
};
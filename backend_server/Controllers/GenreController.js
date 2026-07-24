const GenreService = require("../Services/GenreService");

exports.getAllGenres = async (req, res) => {
  try {
    const data = await GenreService.getAllGenres();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get all genres error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getGenreById = async (req, res) => {
  try {
    const { genre_id } = req.params;
    const data = await GenreService.getGenreById(genre_id);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get genre by id error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.addGenre = async (req, res) => {
  try {
    const genreId = await GenreService.createGenre(req.body);
    return res.status(201).json({
      success: true,
      message: "Thêm thể loại thành công!",
      data: { genre_id: genreId },
    });
  } catch (err) {
    console.error("Add genre error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    const { genre_id } = req.params;
    await GenreService.updateGenre(genre_id, req.body);
    return res.status(200).json({
      success: true,
      message: "Cập nhật thành công!",
    });
  } catch (err) {
    console.error("Update genre error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    const { genre_id } = req.params;
    await GenreService.deleteGenre(genre_id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa thể loại thành công.",
    });
  } catch (err) {
    console.error("Delete genre error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
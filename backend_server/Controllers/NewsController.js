const NewsService = require("../Services/NewsService");

exports.getAllNews = async (req, res) => {
  try {
    const data = await NewsService.getAllNews();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get all news error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getAllNewsAdmin = async (req, res) => {
  try {
    const data = await NewsService.getAllNewsAdmin();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get all news admin error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await NewsService.getNewsById(id);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get news by id error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await NewsService.getNewsBySlug(slug);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get news by slug error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.createNews = async (req, res) => {
  try {
    const newsId = await NewsService.createNews(req.body, req.file);
    return res.status(201).json({
      success: true,
      message: "Tạo bài viết thành công",
      data: { news_id: newsId },
    });
  } catch (err) {
    console.error("Create news error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updateNews = async (req, res) => {
  try {
    const { news_id } = req.params;
    await NewsService.updateNews(news_id, req.body, req.file);
    return res.status(200).json({
      success: true,
      message: "Cập nhật bài viết thành công!",
    });
  } catch (err) {
    console.error("Update news error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    await NewsService.deleteNews(id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa bài viết thành công.",
    });
  } catch (err) {
    console.error("Delete news error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.increaseLike = async (req, res) => {
  try {
    const { id } = req.params;
    await NewsService.likeNews(id);
    return res.status(200).json({
      success: true,
      message: "Like +1 thành công",
    });
  } catch (err) {
    console.error("Increase like error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
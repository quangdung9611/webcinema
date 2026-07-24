const BlogCinemaService = require("../Services/BlogCinemaService");

exports.getAllBlogs = async (req, res) => {
  try {
    const data = await BlogCinemaService.getAllBlogs(true); // active only
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getAllBlogsAdmin = async (req, res) => {
  try {
    const data = await BlogCinemaService.getAllBlogs(false); // all
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const data = await BlogCinemaService.getBlogById(req.params.id);
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getBlogBySlug = async (req, res) => {
  try {
    const data = await BlogCinemaService.getBlogBySlug(req.params.slug);
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.increaseLike = async (req, res) => {
  try {
    await BlogCinemaService.likeBlog(req.params.id);
    res.status(200).json({ success: true, message: "Like +1 thành công" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const blogId = await BlogCinemaService.createBlog(req.body, req.file);
    res.status(201).json({ success: true, message: "Tạo blog thành công!", data: { blog_id: blogId } });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    await BlogCinemaService.updateBlog(req.params.id, req.body, req.file);
    res.status(200).json({ success: true, message: "Cập nhật blog thành công!" });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    await BlogCinemaService.deleteBlog(req.params.id);
    res.status(200).json({ success: true, message: "Đã xóa blog thành công." });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};
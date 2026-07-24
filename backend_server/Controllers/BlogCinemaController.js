const BlogCinemaService = require("../Services/BlogCinemaService");

/* ==========================================================
   GET ALL BLOGS (PUBLIC)
========================================================== */
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await BlogCinemaService.getAllBlogs(true);

        return res.status(200).json(blogs);
    } catch (err) {
        console.error("getAllBlogs error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET ALL BLOGS (ADMIN)
========================================================== */
exports.getAllBlogsAdmin = async (req, res) => {
    try {
        const blogs = await BlogCinemaService.getAllBlogs(false);

        return res.status(200).json(blogs);
    } catch (err) {
        console.error("getAllBlogsAdmin error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET BLOG BY ID (ADMIN)
========================================================== */
exports.getBlogById = async (req, res) => {
    try {
        const { blog_id } = req.params;

        const blog = await BlogCinemaService.getBlogById(blog_id);

        return res.status(200).json(blog);
    } catch (err) {
        console.error("getBlogById error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   GET BLOG BY SLUG (PUBLIC)
========================================================== */
exports.getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await BlogCinemaService.getBlogBySlug(slug);

        return res.status(200).json(blog);
    } catch (err) {
        console.error("getBlogBySlug error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   CREATE BLOG (ADMIN)
========================================================== */
exports.createBlog = async (req, res) => {
    try {
        const blogId = await BlogCinemaService.createBlog(req.body, req.file);

        return res.status(201).json({
            success: true,
            message: "Thêm blog thành công!",
            data: {
                blog_id: blogId
            }
        });
    } catch (err) {
        console.error("createBlog error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   UPDATE BLOG (ADMIN)
========================================================== */
exports.updateBlog = async (req, res) => {
    try {
        const { blog_id } = req.params;

        await BlogCinemaService.updateBlog(
            blog_id,
            req.body,
            req.file
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật blog thành công!"
        });
    } catch (err) {
        console.error("updateBlog error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   DELETE BLOG (ADMIN)
========================================================== */
exports.deleteBlog = async (req, res) => {
    try {
        const { blog_id } = req.params;

        await BlogCinemaService.deleteBlog(blog_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa blog thành công."
        });
    } catch (err) {
        console.error("deleteBlog error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
   LIKE BLOG
========================================================== */
exports.likeBlog = async (req, res) => {
    try {
        const { blog_id } = req.params;

        await BlogCinemaService.likeBlog(blog_id);

        return res.status(200).json({
            success: true,
            message: "Đã tăng lượt thích!"
        });
    } catch (err) {
        console.error("likeBlog error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
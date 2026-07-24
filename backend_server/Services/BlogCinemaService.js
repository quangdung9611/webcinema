// Services/BlogCinemaService.js

const BlogCinemaRepository = require("../Repositories/BlogCinemaRepository");
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../Middlewares/UploadCloudinary");

// ==========================================================
// CREATE SLUG
// ==========================================================
const createSlug = (title) => {
    if (!title) return "";

    return title
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

// ==========================================================
// CLOUDINARY PUBLIC ID
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;

    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) return null;

    return parts
        .slice(uploadIndex + 1)
        .join("/")
        .split(".")[0];
};

// ==========================================================
// VALIDATE
// ==========================================================
const validateBlogData = (data, file, isUpdate = false) => {

    const {
        title,
        description,
        likes
    } = data;

    if (!title || title.trim() === "")
        return "Vui lòng nhập tiêu đề.";

    if (title.trim().length < 5)
        return "Tiêu đề phải từ 5 ký tự.";

    if (!description || description.trim() === "")
        return "Vui lòng nhập mô tả.";

    if (description.trim().length < 10)
        return "Mô tả quá ngắn.";

    if (likes !== undefined && likes !== "") {
        const num = parseInt(likes);

        if (isNaN(num) || num < 0)
            return "Likes không hợp lệ.";
    }

    if (!isUpdate && !file)
        return "Vui lòng upload ảnh.";

    return null;
};

class BlogCinemaService {

    // ==========================================================
    // GET ALL
    // ==========================================================
    async getAllBlogs(onlyActive = true) {
        return await BlogCinemaRepository.findAll(onlyActive);
    }

    // ==========================================================
    // GET ID
    // ==========================================================
    async getBlogById(blogId) {

        const blog = await BlogCinemaRepository.findById(blogId);

        if (!blog) {
            const err = new Error("Không tìm thấy blog");
            err.statusCode = 404;
            throw err;
        }

        return blog;
    }

    // ==========================================================
    // GET SLUG
    // ==========================================================
    async getBlogBySlug(slug) {

        const blog = await BlogCinemaRepository.findBySlug(slug);

        if (!blog) {
            const err = new Error("Không tìm thấy blog");
            err.statusCode = 404;
            throw err;
        }

        await BlogCinemaRepository.incrementViews(blog.blog_id);

        return blog;
    }

    // ==========================================================
    // CREATE
    // ==========================================================
    async createBlog(data, file) {

        const {
            title,
            description,
            likes
        } = data;

        const error = validateBlogData(data, file, false);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const slug = createSlug(title);

        const exists = await BlogCinemaRepository.existsByTitleOrSlug(
            title.trim(),
            slug
        );

        if (exists) {
            const err = new Error("Tiêu đề hoặc slug đã tồn tại");
            err.statusCode = 400;
            throw err;
        }

        let blog_image = null;

        if (file) {
            const result = await uploadToCloudinary(
                file,
                "cinema_shop/blog_cinema"
            );

            blog_image = result.url;
        }

        return await BlogCinemaRepository.create({
            title: title.trim(),
            slug,
            description: description.trim(),
            blog_image,
            likes: parseInt(likes) || 0,
            is_active: 1
        });
    }

    // ==========================================================
    // UPDATE
    // ==========================================================
    async updateBlog(blogId, data, file) {

        const existing = await BlogCinemaRepository.findById(blogId);

        if (!existing) {
            const err = new Error("Blog không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const {
            title,
            description,
            likes,
            is_active
        } = data;

        const error = validateBlogData(data, file, true);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const slug = createSlug(title);

        const exists = await BlogCinemaRepository.existsByTitleOrSlug(
            title.trim(),
            slug,
            blogId
        );

        if (exists) {
            const err = new Error("Tiêu đề hoặc slug đã trùng với blog khác");
            err.statusCode = 400;
            throw err;
        }

        const conn = await BlogCinemaRepository.getConnection();

        try {

            await BlogCinemaRepository.beginTransaction(conn);

            let blog_image = existing.blog_image;

            if (file) {

                if (existing.blog_image) {

                    const publicId = extractPublicId(existing.blog_image);

                    await deleteFromCloudinary(publicId);
                }

                const result = await uploadToCloudinary(
                    file,
                    "cinema_shop/blog_cinema"
                );

                blog_image = result.url;
            }

            await BlogCinemaRepository.updateWithConnection(
                conn,
                blogId,
                {
                    title: title.trim(),
                    slug,
                    description: description.trim(),
                    blog_image,
                    likes: parseInt(likes) || 0,
                    is_active:
                        is_active !== undefined
                            ? parseInt(is_active)
                            : existing.is_active
                }
            );

            await BlogCinemaRepository.commit(conn);

            return true;

        } catch (err) {

            await BlogCinemaRepository.rollback(conn);
            throw err;

        } finally {

            conn.release();

        }
    }

    // ==========================================================
    // DELETE
    // ==========================================================
    async deleteBlog(blogId) {

        const existing = await BlogCinemaRepository.findById(blogId);

        if (!existing) {
            const err = new Error("Blog không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const conn = await BlogCinemaRepository.getConnection();

        try {

            await BlogCinemaRepository.beginTransaction(conn);

            if (existing.blog_image) {

                const publicId = extractPublicId(existing.blog_image);

                await deleteFromCloudinary(publicId);
            }

            await BlogCinemaRepository.deleteWithConnection(
                conn,
                blogId
            );

            await BlogCinemaRepository.commit(conn);

            return true;

        } catch (err) {

            await BlogCinemaRepository.rollback(conn);
            throw err;

        } finally {

            conn.release();

        }
    }

    // ==========================================================
    // LIKE
    // ==========================================================
    async likeBlog(blogId) {

        const affected =
            await BlogCinemaRepository.incrementLikes(blogId);

        if (affected === 0) {

            const err = new Error("Không tìm thấy blog");
            err.statusCode = 404;
            throw err;
        }

        return true;
    }

}

module.exports = new BlogCinemaService();
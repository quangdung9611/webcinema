const NewsRepository = require("../Repositories/NewsRepository");
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../Middlewares/UploadCloudinary");

/* ==========================================================
    CREATE SLUG
========================================================== */

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

/* ==========================================================
    CLOUDINARY PUBLIC ID
========================================================== */

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

/* ==========================================================
    VALIDATE
========================================================== */

const validateNews = (data, file, isUpdate = false) => {

    const {
        title,
        content,
        likes
    } = data;

    if (!title || title.trim() === "")
        return "Vui lòng nhập tiêu đề.";

    if (title.trim().length < 5)
        return "Tiêu đề phải từ 5 ký tự.";

    if (!content || content.trim() === "")
        return "Vui lòng nhập nội dung.";

    if (content.trim().length < 10)
        return "Nội dung phải từ 10 ký tự.";

    if (likes !== undefined && likes !== "") {

        const value = Number(likes);

        if (Number.isNaN(value) || value < 0)
            return "Likes không hợp lệ.";

    }

    if (!isUpdate && !file)
        return "Vui lòng chọn ảnh.";

    return null;
};

class NewsService {

    /* ==========================================================
        GET ALL
    ========================================================== */

    async getAllNews() {
        return await NewsRepository.findAll(true);
    }

    async getAllNewsAdmin() {
        return await NewsRepository.findAllAdmin();
    }

    /* ==========================================================
        GET BY ID
    ========================================================== */

    async getNewsById(newsId) {

        const news = await NewsRepository.findById(newsId);

        if (!news) {

            const err = new Error("Không tìm thấy bài viết");
            err.statusCode = 404;

            throw err;
        }

        return news;
    }

    /* ==========================================================
        GET BY SLUG
    ========================================================== */

    async getNewsBySlug(slug) {

        const news = await NewsRepository.findBySlug(slug);

        if (!news) {

            const err = new Error("Không tìm thấy bài viết");
            err.statusCode = 404;

            throw err;
        }

        await NewsRepository.incrementViews(news.news_id);

        return news;
    }

    /* ==========================================================
        CREATE
    ========================================================== */

    async createNews(data, file) {

        const error = validateNews(data, file, false);

        if (error) {

            const err = new Error(error);
            err.statusCode = 400;

            throw err;
        }

        const {
            title,
            content,
            likes
        } = data;

        const slug = createSlug(title);

        const exists = await NewsRepository.existsByTitleOrSlug(
            title.trim(),
            slug
        );

        if (exists) {

            const err = new Error("Tiêu đề hoặc slug đã tồn tại");
            err.statusCode = 400;

            throw err;
        }

        let news_image = null;

        if (file) {

            const result = await uploadToCloudinary(
                file,
                "cinema_shop/news"
            );

            news_image = result.url;
        }

        return await NewsRepository.create({

            title: title.trim(),

            slug,

            content: content.trim(),

            news_image,

            likes: Number(likes) || 0

        });

    }

    /* ==========================================================
        UPDATE
    ========================================================== */

    async updateNews(newsId, data, file) {

        const existing = await NewsRepository.findById(newsId);

        if (!existing) {

            const err = new Error("Bài viết không tồn tại");
            err.statusCode = 404;

            throw err;
        }

        const error = validateNews(data, file, true);

        if (error) {

            const err = new Error(error);
            err.statusCode = 400;

            throw err;
        }

        const {
            title,
            content,
            likes
        } = data;

        const slug = createSlug(title);

        const exists = await NewsRepository.existsByTitleOrSlug(
            title.trim(),
            slug,
            newsId
        );

        if (exists) {

            const err = new Error("Tiêu đề hoặc slug đã trùng với bài viết khác");
            err.statusCode = 400;

            throw err;
        }

        const conn = await NewsRepository.getConnection();

        try {

            await NewsRepository.beginTransaction(conn);

            let news_image = existing.news_image;

            if (file) {

                if (existing.news_image) {

                    const publicId = extractPublicId(existing.news_image);

                    await deleteFromCloudinary(publicId);

                }

                const result = await uploadToCloudinary(
                    file,
                    "cinema_shop/news"
                );

                news_image = result.url;

            }

            await NewsRepository.updateWithConnection(
                conn,
                newsId,
                {

                    title: title.trim(),

                    slug,

                    content: content.trim(),

                    news_image,

                    likes: Number(likes) || 0

                }
            );

            await NewsRepository.commit(conn);

            return true;

        }

        catch (err) {

            await NewsRepository.rollback(conn);

            throw err;

        }

        finally {

            conn.release();

        }

    }

    /* ==========================================================
        DELETE
    ========================================================== */

    async deleteNews(newsId) {

        const existing = await NewsRepository.findById(newsId);

        if (!existing) {

            const err = new Error("Bài viết không tồn tại");
            err.statusCode = 404;

            throw err;
        }

        const conn = await NewsRepository.getConnection();

        try {

            await NewsRepository.beginTransaction(conn);

            if (existing.news_image) {

                const publicId = extractPublicId(existing.news_image);

                await deleteFromCloudinary(publicId);

            }

            await NewsRepository.deleteWithConnection(
                conn,
                newsId
            );

            await NewsRepository.commit(conn);

            return true;

        }

        catch (err) {

            await NewsRepository.rollback(conn);

            throw err;

        }

        finally {

            conn.release();

        }

    }

    /* ==========================================================
        LIKE
    ========================================================== */

    async likeNews(newsId) {

        const affected = await NewsRepository.incrementLikes(newsId);

        if (!affected) {

            const err = new Error("Không tìm thấy bài viết");
            err.statusCode = 404;

            throw err;
        }

        return true;
    }

}

module.exports = new NewsService();
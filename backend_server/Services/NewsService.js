const NewsRepository = require("../Repositories/NewsRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

// ==========================================================
// HELPER - CREATE SLUG
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
// HELPER - EXTRACT CLOUDINARY PUBLIC ID
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join("/").split(".")[0];
};

// ==========================================================
// VALIDATE NEWS
// ==========================================================
const validateNews = (data, files, isUpdate = false) => {
    const { title, content, likes } = data;
    if (!title || title.trim() === "") return "Vui lòng nhập tiêu đề.";
    if (title.trim().length < 5) return "Tiêu đề phải từ 5 ký tự.";
    if (!content || content.trim() === "") return "Vui lòng nhập nội dung.";
    if (content.trim().length < 10) return "Nội dung phải từ 10 ký tự.";
    if (likes !== undefined && likes !== "") {
        const value = Number(likes);
        if (Number.isNaN(value) || value < 0) return "Likes không hợp lệ.";
    }
    if (!isUpdate && (!files || !files['news_image'])) {
        return "Vui lòng chọn ảnh.";
    }
    return null;
};

class NewsService {

    /*=========================================================
        GET ALL NEWS - KHÔNG PHÂN TRANG
        RETURN: rows[] (trực tiếp từ repository)
    =========================================================*/
    async getAllNewsAll(search = "") {
        return await NewsRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL NEWS - CÓ PHÂN TRANG
        RETURN: { data: [], pagination: {} }
    =========================================================*/
    async getAllNewsPaginated(page = 1, limit = 20, search = "") {
        return await NewsRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET NEWS BY ID (ADMIN)
    =========================================================*/
    async getNewsById(newsId) {
        const news = await NewsRepository.findById(newsId);
        if (!news) {
            const err = new Error("Không tìm thấy bài viết");
            err.statusCode = 404;
            throw err;
        }
        return news;
    }

    /*=========================================================
        GET NEWS BY SLUG (PUBLIC) - TĂNG LƯỢT XEM
    =========================================================*/
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

    /*=========================================================
        CREATE NEWS (ADMIN)
    =========================================================*/
    async createNews(data, files) {
        const error = validateNews(data, files, false);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const { title, content, likes } = data;
        const slug = createSlug(title);

        const exists = await NewsRepository.existsByTitleOrSlug(title.trim(), slug);
        if (exists) {
            const err = new Error("Tiêu đề hoặc slug đã tồn tại");
            err.statusCode = 400;
            err.field = "title";
            throw err;
        }

        let news_image = null;
        let news_backdrop = null;

        // Upload ảnh chính
        if (files['news_image']?.[0]) {
            const result = await uploadToCloudinary(files['news_image'][0], "cinema_shop/news");
            news_image = result.url;
        }

        // Upload ảnh backdrop
        if (files['news_backdrop']?.[0]) {
            const result = await uploadToCloudinary(files['news_backdrop'][0], "cinema_shop/news/backdrops");
            news_backdrop = result.url;
        }

        return await NewsRepository.create({
            title: title.trim(),
            slug,
            content: content.trim(),
            news_image,
            news_backdrop,
            likes: Number(likes) || 0
        });
    }

    /*=========================================================
        UPDATE NEWS (ADMIN) - SỬA LOGIC GIỐNG MOVIE
    =========================================================*/
    async updateNews(newsId, data, files) {
        const existing = await NewsRepository.findById(newsId);
        if (!existing) {
            const err = new Error("Bài viết không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const error = validateNews(data, files, true);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const { title, content, likes } = data;
        const slug = createSlug(title);

        // 👇 CHỈ KIỂM TRA TRÙNG KHI TITLE HOẶC SLUG THAY ĐỔI (GIỐNG MOVIE)
        if (
            title.trim() !== existing.title ||
            slug !== existing.slug
        ) {
            const exists = await NewsRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                newsId
            );
            if (exists) {
                const err = new Error("Tiêu đề hoặc slug đã trùng với bài viết khác");
                err.statusCode = 400;
                err.field = "title";
                throw err;
            }
        }

        const connection = await NewsRepository.getConnection();
        try {
            await NewsRepository.beginTransaction(connection);

            // Giữ ảnh cũ
            let news_image = existing.news_image;
            let news_backdrop = existing.news_backdrop;

            // Xử lý ảnh chính mới
            if (files['news_image']?.[0]) {
                if (existing.news_image) {
                    const publicId = extractPublicId(existing.news_image);
                    if (publicId) await deleteFromCloudinary(publicId);
                }
                const result = await uploadToCloudinary(files['news_image'][0], "cinema_shop/news");
                news_image = result.url;
            }

            // Xử lý ảnh backdrop mới
            if (files['news_backdrop']?.[0]) {
                if (existing.news_backdrop) {
                    const publicId = extractPublicId(existing.news_backdrop);
                    if (publicId) await deleteFromCloudinary(publicId);
                }
                const result = await uploadToCloudinary(files['news_backdrop'][0], "cinema_shop/news/backdrops");
                news_backdrop = result.url;
            }

            await NewsRepository.updateWithConnection(connection, newsId, {
                title: title.trim(),
                slug,
                content: content.trim(),
                news_image,
                news_backdrop,
                likes: Number(likes) || 0
            });

            await NewsRepository.commit(connection);
            return true;
        } catch (err) {
            await NewsRepository.rollback(connection);
            throw err;
        } finally {
            connection.release();
        }
    }

    /*=========================================================
        DELETE NEWS (ADMIN)
    =========================================================*/
    async deleteNews(newsId) {
        const existing = await NewsRepository.findById(newsId);
        if (!existing) {
            const err = new Error("Bài viết không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const connection = await NewsRepository.getConnection();
        try {
            await NewsRepository.beginTransaction(connection);

            // Xóa ảnh chính trên Cloudinary
            if (existing.news_image) {
                const publicId = extractPublicId(existing.news_image);
                if (publicId) await deleteFromCloudinary(publicId);
            }

            // Xóa ảnh backdrop trên Cloudinary
            if (existing.news_backdrop) {
                const publicId = extractPublicId(existing.news_backdrop);
                if (publicId) await deleteFromCloudinary(publicId);
            }

            await NewsRepository.deleteWithConnection(connection, newsId);
            await NewsRepository.commit(connection);
            return true;
        } catch (err) {
            await NewsRepository.rollback(connection);
            throw err;
        } finally {
            connection.release();
        }
    }

    /*=========================================================
        LIKE NEWS (PUBLIC)
    =========================================================*/
    async likeNews(newsId) {
        const affected = await NewsRepository.incrementLikes(newsId);
        if (affected === 0) {
            const err = new Error("Không tìm thấy bài viết");
            err.statusCode = 404;
            throw err;
        }
        return true;
    }
}

module.exports = new NewsService();
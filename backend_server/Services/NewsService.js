// services/NewsService.js
const NewsRepository = require('../Repositories/NewsRepository');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');

// ==========================================================
// HELPER - CREATE SLUG
// ==========================================================
const createSlug = (title) => {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// ==========================================================
// HELPER - EXTRACT CLOUDINARY PUBLIC ID
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// ==========================================================
// HELPER - GET FILE NAME FROM URL
// ==========================================================
const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
};

// ==========================================================
// VALIDATE NEWS
// ==========================================================
const validateNews = (data, files, isUpdate = false) => {
    const { title, content, likes } = data;

    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề bài viết.';
    }

    if (title.trim().length < 5) {
        return 'Tiêu đề bài viết phải từ 5 ký tự trở lên.';
    }

    if (!content || content.trim() === '') {
        return 'Vui lòng nhập nội dung bài viết.';
    }

    if (content.trim().length < 10) {
        return 'Nội dung bài viết phải từ 10 ký tự trở lên.';
    }

    if (likes !== undefined && likes !== '' && Number(likes) < 0) {
        return 'Số lượt thích không hợp lệ.';
    }

    if (!isUpdate && (!files || !files['news_image'])) {
        return 'Vui lòng upload ảnh cho bài viết.';
    }

    return null;
};

class NewsService {

    /*=========================================================
        GET ALL NEWS - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllNewsAll(search = '') {
        return await NewsRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL NEWS - CÓ PHÂN TRANG
    =========================================================*/
    async getAllNewsPaginated(page = 1, limit = 20, search = '') {
        return await NewsRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET NEWS BY ID (ADMIN)
    =========================================================*/
    async getNewsById(newsId) {
        const news = await NewsRepository.findById(newsId);
        if (!news) {
            throw { statusCode: 404, message: 'Không tìm thấy bài viết' };
        }
        return news;
    }

    /*=========================================================
        GET NEWS BY SLUG (PUBLIC) - TĂNG LƯỢT XEM
    =========================================================*/
    async getNewsBySlug(slug) {
        const news = await NewsRepository.findBySlug(slug);
        if (!news) {
            throw { statusCode: 404, message: 'Không tìm thấy bài viết' };
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
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, content, likes } = data;
        const slug = createSlug(title);

        // Kiểm tra trùng title/slug
        const exists = await NewsRepository.existsByTitleOrSlug(title.trim(), slug);
        if (exists) {
            throw {
                statusCode: 400,
                field: 'title',
                message: `Tiêu đề "${title}" đã tồn tại trong hệ thống.`
            };
        }

        // Upload ảnh
        let news_image = null;
        let news_backdrop = null;

        if (files['news_image']?.[0]) {
            const result = await uploadToCloudinary(
                files['news_image'][0],
                'cinema_shop/news'
            );
            news_image = result.url;
        }

        if (files['news_backdrop']?.[0]) {
            const result = await uploadToCloudinary(
                files['news_backdrop'][0],
                'cinema_shop/news/backdrops'
            );
            news_backdrop = result.url;
        }

        const newsId = await NewsRepository.create({
            title: title.trim(),
            slug,
            content: content.trim(),
            news_image,
            news_backdrop,
            likes: Number(likes) || 0
        });

        return newsId;
    }

    /*=========================================================
        UPDATE NEWS (ADMIN) - SỬA LOGIC GIỐNG MOVIE
    =========================================================*/
    async updateNews(newsId, data, files) {
        const existing = await NewsRepository.findById(newsId);
        if (!existing) {
            throw { statusCode: 404, message: 'Bài viết không tồn tại' };
        }

        const error = validateNews(data, files, true);
        if (error) {
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, content, likes } = data;
        const slug = createSlug(title);

        // CHỈ KIỂM TRA TRÙNG KHI TITLE HOẶC SLUG THAY ĐỔI
        if (title.trim() !== existing.title || slug !== existing.slug) {
            const exists = await NewsRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                newsId
            );
            if (exists) {
                throw {
                    statusCode: 400,
                    field: 'title',
                    message: `Tiêu đề "${title}" đã tồn tại trong hệ thống.`
                };
            }
        }

        const connection = await NewsRepository.getConnection();

        try {
            await NewsRepository.beginTransaction(connection);

            let news_image = existing.news_image;
            let news_backdrop = existing.news_backdrop;

            // Xử lý ảnh chính
            if (files['news_image']?.[0]) {
                if (existing.news_image) {
                    const publicId = extractPublicId(existing.news_image);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
                const result = await uploadToCloudinary(
                    files['news_image'][0],
                    'cinema_shop/news'
                );
                news_image = result.url;
            }

            // Xử lý backdrop
            if (files['news_backdrop']?.[0]) {
                if (existing.news_backdrop) {
                    const publicId = extractPublicId(existing.news_backdrop);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
                const result = await uploadToCloudinary(
                    files['news_backdrop'][0],
                    'cinema_shop/news/backdrops'
                );
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
            throw { statusCode: 404, message: 'Bài viết không tồn tại' };
        }

        const connection = await NewsRepository.getConnection();

        try {
            await NewsRepository.beginTransaction(connection);

            // Xóa ảnh trên Cloudinary
            if (existing.news_image) {
                const publicId = extractPublicId(existing.news_image);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }

            if (existing.news_backdrop) {
                const publicId = extractPublicId(existing.news_backdrop);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
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
            throw { statusCode: 404, message: 'Không tìm thấy bài viết' };
        }
        return true;
    }
}

module.exports = new NewsService();
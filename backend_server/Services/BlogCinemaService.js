// services/BlogCinemaService.js
const BlogCinemaRepository = require('../Repositories/BlogCinemaRepository');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');

// =========================================================
// HELPER - CREATE SLUG
// =========================================================
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

// =========================================================
// HELPER - EXTRACT PUBLIC ID FROM CLOUDINARY URL
// =========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// =========================================================
// HELPER - GET FILE NAME FROM URL
// =========================================================
const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
};

// =========================================================
// VALIDATE BLOG DATA
// =========================================================
const validateBlogData = (data, files, isUpdate = false) => {
    const { title, description, likes } = data;

    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề blog.';
    }

    if (title.trim().length < 5) {
        return 'Tiêu đề blog phải từ 5 ký tự trở lên.';
    }

    if (!description || description.trim() === '') {
        return 'Vui lòng nhập mô tả blog.';
    }

    if (description.trim().length < 10) {
        return 'Mô tả blog phải từ 10 ký tự trở lên.';
    }

    if (likes !== undefined && likes !== '' && Number(likes) < 0) {
        return 'Số lượt thích không hợp lệ.';
    }

    if (!isUpdate && (!files || !files['blog_image'])) {
        return 'Vui lòng upload ảnh cho blog.';
    }

    return null;
};

class BlogCinemaService {

    /* =========================================================
        GET ALL BLOGS - KHÔNG PHÂN TRANG
    ========================================================= */
    async getAllBlogsAll(search = '') {
        return await BlogCinemaRepository.findAllAll(search);
    }

    /* =========================================================
        GET ALL BLOGS - CÓ PHÂN TRANG
    ========================================================= */
    async getAllBlogsPaginated(page = 1, limit = 20, search = '') {
        return await BlogCinemaRepository.findAll(false, page, limit, search);
    }

    /* =========================================================
        GET BLOG BY ID
    ========================================================= */
    async getBlogById(blogId) {
        const blog = await BlogCinemaRepository.findById(blogId);
        if (!blog) {
            throw { statusCode: 404, message: 'Không tìm thấy blog' };
        }
        return blog;
    }

    /* =========================================================
        GET BLOG BY SLUG
    ========================================================= */
    async getBlogBySlug(slug) {
        const blog = await BlogCinemaRepository.findBySlug(slug);
        if (!blog) {
            throw { statusCode: 404, message: 'Không tìm thấy blog' };
        }
        // Tăng lượt xem
        await BlogCinemaRepository.incrementViews(blog.blog_id);
        return blog;
    }

    /* =========================================================
        CREATE BLOG
    ========================================================= */
    async createBlog(data, files) {
        const error = validateBlogData(data, files, false);
        if (error) {
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, description, likes } = data;
        const slug = createSlug(title);

        // Kiểm tra trùng title/slug
        const exists = await BlogCinemaRepository.existsByTitleOrSlug(title.trim(), slug);
        if (exists) {
            throw {
                statusCode: 400,
                field: 'title',
                message: `Tiêu đề "${title}" đã tồn tại trong hệ thống.`
            };
        }

        // Upload ảnh
        let blog_image = null;
        let blog_backdrop = null;

        if (files['blog_image']?.[0]) {
            const result = await uploadToCloudinary(
                files['blog_image'][0],
                'cinema_shop/blog_cinema'
            );
            blog_image = result.url;
        }

        if (files['blog_backdrop']?.[0]) {
            const result = await uploadToCloudinary(
                files['blog_backdrop'][0],
                'cinema_shop/blog_cinema/backdrops'
            );
            blog_backdrop = result.url;
        }

        const blogId = await BlogCinemaRepository.create({
            title: title.trim(),
            slug,
            description: description.trim(),
            blog_image,
            blog_backdrop,
            likes: Number(likes) || 0,
            is_active: 1
        });

        return blogId;
    }

    /* =========================================================
        UPDATE BLOG
    ========================================================= */
    async updateBlog(blogId, data, files) {
        const existing = await BlogCinemaRepository.findById(blogId);
        if (!existing) {
            throw { statusCode: 404, message: 'Blog không tồn tại' };
        }

        const error = validateBlogData(data, files, true);
        if (error) {
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, description, likes, is_active } = data;
        const slug = createSlug(title);

        // Kiểm tra trùng với các blog khác
        if (title.trim() !== existing.title || slug !== existing.slug) {
            const exists = await BlogCinemaRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                blogId
            );
            if (exists) {
                throw {
                    statusCode: 400,
                    field: 'title',
                    message: `Tiêu đề "${title}" đã tồn tại trong hệ thống.`
                };
            }
        }

        const conn = await BlogCinemaRepository.getConnection();

        try {
            await BlogCinemaRepository.beginTransaction(conn);

            let blog_image = existing.blog_image;
            let blog_backdrop = existing.blog_backdrop;

            // Xử lý ảnh chính
            if (files['blog_image']?.[0]) {
                if (existing.blog_image) {
                    const publicId = extractPublicId(existing.blog_image);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
                const result = await uploadToCloudinary(
                    files['blog_image'][0],
                    'cinema_shop/blog_cinema'
                );
                blog_image = result.url;
            }

            // Xử lý backdrop
            if (files['blog_backdrop']?.[0]) {
                if (existing.blog_backdrop) {
                    const publicId = extractPublicId(existing.blog_backdrop);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
                const result = await uploadToCloudinary(
                    files['blog_backdrop'][0],
                    'cinema_shop/blog_cinema/backdrops'
                );
                blog_backdrop = result.url;
            }

            const affected = await BlogCinemaRepository.updateWithConnection(conn, blogId, {
                title: title.trim(),
                slug,
                description: description.trim(),
                blog_image,
                blog_backdrop,
                likes: Number(likes) || 0,
                is_active: is_active !== undefined ? Number(is_active) : existing.is_active
            });

            if (affected === 0) {
                throw new Error('Không thể cập nhật blog');
            }

            await BlogCinemaRepository.commit(conn);
            return true;

        } catch (err) {
            await BlogCinemaRepository.rollback(conn);
            throw err;
        } finally {
            conn.release();
        }
    }

    /* =========================================================
        DELETE BLOG
    ========================================================= */
    async deleteBlog(blogId) {
        const existing = await BlogCinemaRepository.findById(blogId);
        if (!existing) {
            throw { statusCode: 404, message: 'Blog không tồn tại' };
        }

        const conn = await BlogCinemaRepository.getConnection();

        try {
            await BlogCinemaRepository.beginTransaction(conn);

            // Xóa ảnh trên Cloudinary
            if (existing.blog_image) {
                const publicId = extractPublicId(existing.blog_image);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }

            if (existing.blog_backdrop) {
                const publicId = extractPublicId(existing.blog_backdrop);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }

            const affected = await BlogCinemaRepository.deleteWithConnection(conn, blogId);
            if (affected === 0) {
                throw new Error('Xóa blog thất bại');
            }

            await BlogCinemaRepository.commit(conn);
            return true;

        } catch (err) {
            await BlogCinemaRepository.rollback(conn);
            throw err;
        } finally {
            conn.release();
        }
    }

    /* =========================================================
        LIKE BLOG
    ========================================================= */
    async likeBlog(blogId) {
        const affected = await BlogCinemaRepository.incrementLikes(blogId);
        if (affected === 0) {
            throw { statusCode: 404, message: 'Không tìm thấy blog' };
        }
        return true;
    }
}

module.exports = new BlogCinemaService();
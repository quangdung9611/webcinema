// services/PromotionService.js
const PromotionRepository = require('../Repositories/PromotionRepository');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');

// =========================================================
// HELPER - TẠO SLUG
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
// HELPER - TRÍCH XUẤT PUBLIC_ID CLOUDINARY
// =========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// =========================================================
// HELPER - LẤY TÊN FILE TỪ URL
// =========================================================
const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
};

// =========================================================
// VALIDATE PROMOTION DATA
// =========================================================
const validatePromotionData = (data, files, isUpdate = false) => {
    const { title, description, likes } = data;

    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề khuyến mãi.';
    }

    if (title.trim().length < 5) {
        return 'Tiêu đề khuyến mãi phải từ 5 ký tự trở lên.';
    }

    if (!description || description.trim() === '') {
        return 'Vui lòng nhập mô tả khuyến mãi.';
    }

    if (description.trim().length < 10) {
        return 'Mô tả khuyến mãi phải từ 10 ký tự trở lên.';
    }

    if (likes !== undefined && likes !== '' && Number(likes) < 0) {
        return 'Số lượt thích không hợp lệ.';
    }

    if (!isUpdate && (!files || !files['promotion_image'])) {
        return 'Vui lòng upload ảnh cho khuyến mãi.';
    }

    return null;
};

class PromotionService {

    /*=========================================================
        GET ALL PROMOTIONS - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllPromotionsAll(search = '') {
        return await PromotionRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL PROMOTIONS - CÓ PHÂN TRANG
    =========================================================*/
    async getAllPromotions(page = 1, limit = 20, search = '') {
        return await PromotionRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET PROMOTION BY ID
    =========================================================*/
    async getPromotionById(promotionId) {
        const promotion = await PromotionRepository.findById(promotionId);
        if (!promotion) {
            throw { statusCode: 404, message: 'Không tìm thấy khuyến mãi' };
        }
        return promotion;
    }

    /*=========================================================
        GET PROMOTION BY SLUG
    =========================================================*/
    async getPromotionBySlug(slug) {
        const promotion = await PromotionRepository.findBySlug(slug);
        if (!promotion) {
            throw { statusCode: 404, message: 'Không tìm thấy khuyến mãi' };
        }
        // Tăng lượt xem
        await PromotionRepository.incrementViews(promotion.promotion_id);
        return promotion;
    }

    /*=========================================================
        CREATE PROMOTION
    =========================================================*/
    async createPromotion(data, files) {
        const error = validatePromotionData(data, files, false);
        if (error) {
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, description, likes, is_active } = data;
        const slug = createSlug(title);

        // Kiểm tra trùng title/slug
        const exists = await PromotionRepository.existsByTitleOrSlug(title.trim(), slug);
        if (exists) {
            throw {
                statusCode: 400,
                field: 'title',
                message: `Khuyến mãi "${title}" đã tồn tại trong hệ thống.`
            };
        }

        // Upload ảnh
        let promotion_image = null;
        let promotion_backdrop = null;

        if (files['promotion_image']?.[0]) {
            const result = await uploadToCloudinary(
                files['promotion_image'][0],
                'cinema_shop/promotions'
            );
            promotion_image = result.url;
        }

        if (files['promotion_backdrop']?.[0]) {
            const result = await uploadToCloudinary(
                files['promotion_backdrop'][0],
                'cinema_shop/promotions/backdrops'
            );
            promotion_backdrop = result.url;
        }

        const promotionId = await PromotionRepository.create({
            title: title.trim(),
            slug,
            description: description.trim(),
            promotion_image,
            promotion_backdrop,
            likes: Number(likes) || 0,
            is_active: is_active !== undefined ? Number(is_active) : 1
        });

        return promotionId;
    }

    /*=========================================================
        UPDATE PROMOTION - GIỐNG MOVIE
    =========================================================*/
    async updatePromotion(promotionId, data, files) {
        const existing = await PromotionRepository.findById(promotionId);
        if (!existing) {
            throw { statusCode: 404, message: 'Khuyến mãi không tồn tại' };
        }

        const error = validatePromotionData(data, files, true);
        if (error) {
            throw { statusCode: 400, field: 'general', message: error };
        }

        const { title, description, likes, is_active } = data;
        const slug = createSlug(title);

        // CHỈ KIỂM TRA TRÙNG KHI TITLE HOẶC SLUG THAY ĐỔI
        if (title.trim() !== existing.title || slug !== existing.slug) {
            const exists = await PromotionRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                promotionId
            );
            if (exists) {
                throw {
                    statusCode: 400,
                    field: 'title',
                    message: `Tiêu đề "${title}" đã tồn tại trong hệ thống.`
                };
            }
        }

        let finalImage = existing.promotion_image;
        let finalBackdrop = existing.promotion_backdrop;

        // Xử lý ảnh chính
        if (files['promotion_image']?.[0]) {
            if (existing.promotion_image) {
                const publicId = extractPublicId(existing.promotion_image);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }
            const result = await uploadToCloudinary(
                files['promotion_image'][0],
                'cinema_shop/promotions'
            );
            finalImage = result.url;
        }

        // Xử lý backdrop
        if (files['promotion_backdrop']?.[0]) {
            if (existing.promotion_backdrop) {
                const publicId = extractPublicId(existing.promotion_backdrop);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }
            const result = await uploadToCloudinary(
                files['promotion_backdrop'][0],
                'cinema_shop/promotions/backdrops'
            );
            finalBackdrop = result.url;
        }

        const affected = await PromotionRepository.update(promotionId, {
            title: title.trim(),
            slug,
            description: description.trim(),
            promotion_image: finalImage,
            promotion_backdrop: finalBackdrop,
            likes: Number(likes) || 0,
            is_active: is_active !== undefined ? Number(is_active) : existing.is_active
        });

        if (affected === 0) {
            throw { statusCode: 500, message: 'Không thể cập nhật khuyến mãi' };
        }

        return true;
    }

    /*=========================================================
        DELETE PROMOTION
    =========================================================*/
    async deletePromotion(promotionId) {
        const promotion = await PromotionRepository.findById(promotionId);
        if (!promotion) {
            throw { statusCode: 404, message: 'Khuyến mãi không tồn tại' };
        }

        if (promotion.promotion_image) {
            const publicId = extractPublicId(promotion.promotion_image);
            if (publicId) {
                await deleteFromCloudinary(publicId);
            }
        }

        if (promotion.promotion_backdrop) {
            const publicId = extractPublicId(promotion.promotion_backdrop);
            if (publicId) {
                await deleteFromCloudinary(publicId);
            }
        }

        const affected = await PromotionRepository.delete(promotionId);
        if (affected === 0) {
            throw { statusCode: 500, message: 'Xóa khuyến mãi thất bại' };
        }

        return true;
    }

    /*=========================================================
        LIKE PROMOTION
    =========================================================*/
    async likePromotion(promotionId) {
        const affected = await PromotionRepository.incrementLikes(promotionId);
        if (affected === 0) {
            throw { statusCode: 404, message: 'Khuyến mãi không tồn tại' };
        }
        return true;
    }

    /*=========================================================
        TOGGLE STATUS
    =========================================================*/
    async toggleStatus(promotionId) {
        const status = await PromotionRepository.toggleStatus(promotionId);
        if (status === null) {
            throw { statusCode: 404, message: 'Khuyến mãi không tồn tại' };
        }
        return status;
    }
}

module.exports = new PromotionService();
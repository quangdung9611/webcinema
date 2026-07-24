const PromotionRepository = require("../Repositories/PromotionRepository");
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
    CLOUDINARY
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
const validatePromotion = (data, file, isUpdate = false) => {
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
        return "Mô tả phải từ 10 ký tự.";

    if (likes !== undefined && likes !== "") {
        const parsed = parseInt(likes, 10);

        if (isNaN(parsed) || parsed < 0) {
            return "Likes không hợp lệ.";
        }
    }

    if (!isUpdate && !file) {
        return "Vui lòng chọn hình ảnh.";
    }

    return null;
};

class PromotionService {

    /* ==========================================================
        GET ALL
    ========================================================== */

    async getAllPromotions(onlyActive = true) {
        return await PromotionRepository.findAll(onlyActive);
    }

    /* ==========================================================
        GET BY ID
    ========================================================== */

    async getPromotionById(promotionId) {

        const promotion = await PromotionRepository.findById(promotionId);

        if (!promotion) {
            const err = new Error("Không tìm thấy khuyến mãi");
            err.statusCode = 404;
            throw err;
        }

        return promotion;
    }

    /* ==========================================================
        GET BY SLUG
    ========================================================== */

    async getPromotionBySlug(slug) {

        const promotion = await PromotionRepository.findBySlug(slug);

        if (!promotion) {
            const err = new Error("Không tìm thấy khuyến mãi");
            err.statusCode = 404;
            throw err;
        }

        await PromotionRepository.incrementViews(
            promotion.promotion_id
        );

        return promotion;
    }

    /* ==========================================================
        CREATE
    ========================================================== */

    async createPromotion(data, file) {

        const error = validatePromotion(data, file);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            title,
            description,
            likes
        } = data;

        const slug = createSlug(title);

        const duplicate =
            await PromotionRepository.findByTitleOrSlug(
                title.trim(),
                slug
            );

        if (duplicate) {
            const err = new Error("Tiêu đề hoặc slug đã tồn tại");
            err.statusCode = 400;
            throw err;
        }

        let promotion_image = null;

        if (file) {

            const result =
                await uploadToCloudinary(
                    file,
                    "cinema_shop/promotions"
                );

            promotion_image = result.url;
        }

        return await PromotionRepository.create({

            title: title.trim(),

            slug,

            description: description.trim(),

            promotion_image,

            likes: parseInt(likes, 10) || 0,

            is_active: 1
        });
    }

    /* ==========================================================
        UPDATE
    ========================================================== */

    async updatePromotion(
        promotionId,
        data,
        file
    ) {

        const promotion =
            await PromotionRepository.findById(
                promotionId
            );

        if (!promotion) {
            const err = new Error("Khuyến mãi không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const error =
            validatePromotion(data, file, true);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            title,
            description,
            likes,
            is_active
        } = data;

        const slug = createSlug(title);

        const duplicate =
            await PromotionRepository.findByTitleOrSlug(
                title.trim(),
                slug,
                promotionId
            );

        if (duplicate) {
            const err = new Error("Tiêu đề hoặc slug đã tồn tại");
            err.statusCode = 400;
            throw err;
        }

        const connection =
            await PromotionRepository.getConnection();

        try {

            await PromotionRepository.beginTransaction(
                connection
            );

            let promotionImage =
                promotion.promotion_image;

            if (file) {

                if (promotion.promotion_image) {

                    const publicId =
                        extractPublicId(
                            promotion.promotion_image
                        );

                    await deleteFromCloudinary(
                        publicId
                    );
                }

                const result =
                    await uploadToCloudinary(
                        file,
                        "cinema_shop/promotions"
                    );

                promotionImage =
                    result.url;
            }

            await PromotionRepository.update(
                promotionId,
                {
                    title: title.trim(),
                    slug,
                    description: description.trim(),
                    promotion_image: promotionImage,
                    likes: parseInt(likes, 10) || 0,
                    is_active:
                        is_active !== undefined
                            ? parseInt(is_active, 10)
                            : promotion.is_active
                }
            );

            await PromotionRepository.commit(
                connection
            );

            return true;

        } catch (err) {

            await PromotionRepository.rollback(
                connection
            );

            throw err;

        } finally {

            connection.release();

        }
    }

    /* ==========================================================
        DELETE
    ========================================================== */

    async deletePromotion(promotionId) {

        const promotion =
            await PromotionRepository.findById(
                promotionId
            );

        if (!promotion) {
            const err = new Error("Khuyến mãi không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const connection =
            await PromotionRepository.getConnection();

        try {

            await PromotionRepository.beginTransaction(
                connection
            );

            if (promotion.promotion_image) {

                const publicId =
                    extractPublicId(
                        promotion.promotion_image
                    );

                await deleteFromCloudinary(
                    publicId
                );
            }

            await PromotionRepository.delete(
                promotionId
            );

            await PromotionRepository.commit(
                connection
            );

            return true;

        } catch (err) {

            await PromotionRepository.rollback(
                connection
            );

            throw err;

        } finally {

            connection.release();

        }
    }

    /* ==========================================================
        LIKE
    ========================================================== */

    async likePromotion(promotionId) {

        const affected =
            await PromotionRepository.incrementLikes(
                promotionId
            );

        if (!affected) {

            const err = new Error(
                "Không tìm thấy khuyến mãi"
            );

            err.statusCode = 404;

            throw err;
        }

        return true;
    }

    /* ==========================================================
        TOGGLE STATUS
    ========================================================== */

    async toggleStatus(promotionId) {

        const status =
            await PromotionRepository.toggleStatus(
                promotionId
            );

        if (status === null) {

            const err = new Error(
                "Không tìm thấy khuyến mãi"
            );

            err.statusCode = 404;

            throw err;
        }

        return status;
    }
}

module.exports = new PromotionService();
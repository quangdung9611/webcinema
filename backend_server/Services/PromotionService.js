const PromotionRepository = require("../Repositories/PromotionRepository");
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
// EXTRACT CLOUDINARY PUBLIC ID
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;

    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) {
        return null;
    }

    return parts
        .slice(uploadIndex + 1)
        .join("/")
        .split(".")[0];
};

// ==========================================================
// VALIDATE PROMOTION DATA
// ==========================================================
const validatePromotion = (data, file, isUpdate = false) => {

    const {
        title,
        description,
        likes,
        is_active
    } = data;

    // ------------------------------------------------------
    // TITLE
    // ------------------------------------------------------
    if (!title || title.trim() === "") {
        return "Vui lòng nhập tiêu đề.";
    }

    if (title.trim().length < 5) {
        return "Tiêu đề phải từ 5 ký tự.";
    }

    // ------------------------------------------------------
    // DESCRIPTION
    // ------------------------------------------------------
    if (!description || description.trim() === "") {
        return "Vui lòng nhập mô tả.";
    }

    if (description.trim().length < 10) {
        return "Mô tả phải từ 10 ký tự.";
    }

    // ------------------------------------------------------
    // LIKES
    // ------------------------------------------------------
    if (likes !== undefined && likes !== "") {

        const parsedLikes = Number(likes);

        if (
            !Number.isInteger(parsedLikes) ||
            parsedLikes < 0
        ) {
            return "Likes không hợp lệ.";
        }
    }

    // ------------------------------------------------------
    // IS ACTIVE
    // ------------------------------------------------------
    if (is_active !== undefined && is_active !== "") {

        const parsedStatus = Number(is_active);

        if (
            !Number.isInteger(parsedStatus) ||
            ![0, 1].includes(parsedStatus)
        ) {
            return "Trạng thái hoạt động không hợp lệ.";
        }
    }

    // ------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------
    if (!isUpdate && !file) {
        return "Vui lòng chọn hình ảnh.";
    }

    return null;
};

class PromotionService {

    /* ==========================================================
        GET ALL PROMOTIONS - KHÔNG PHÂN TRANG
        PUBLIC / ADMIN
    ========================================================== */
    async getAllPromotionsAll(search = "") {
        return await PromotionRepository.findAllAll(search);
    }

    /* ==========================================================
        GET ALL PROMOTIONS - CÓ PHÂN TRANG
        ADMIN
    ========================================================== */
    async getAllPromotionsPaginated(
        page = 1,
        limit = 20,
        search = ""
    ) {
        return await PromotionRepository.findAll(
            false,
            page,
            limit,
            search
        );
    }

    /* ==========================================================
        GET PROMOTION BY ID
        ADMIN
    ========================================================== */
    async getPromotionById(promotionId) {

        const promotion = await PromotionRepository.findById(
            promotionId
        );

        if (!promotion) {
            const err = new Error(
                "Không tìm thấy khuyến mãi"
            );

            err.statusCode = 404;
            throw err;
        }

        return promotion;
    }

    /* ==========================================================
        GET PROMOTION BY SLUG
        PUBLIC
    ========================================================== */
    async getPromotionBySlug(slug) {

        const promotion =
            await PromotionRepository.findBySlug(slug);

        if (!promotion) {
            const err = new Error(
                "Không tìm thấy khuyến mãi"
            );

            err.statusCode = 404;
            throw err;
        }

        // Tăng lượt xem
        await PromotionRepository.incrementViews(
            promotion.promotion_id
        );

        return promotion;
    }

    /* ==========================================================
        CREATE PROMOTION
        ADMIN
    ========================================================== */
    async createPromotion(data, file) {

        // ------------------------------------------------------
        // VALIDATE
        // ------------------------------------------------------
        const error = validatePromotion(
            data,
            file,
            false
        );

        if (error) {
            const err = new Error(error);

            err.statusCode = 400;
            err.field = "general";

            throw err;
        }

        const {
            title,
            description,
            likes
        } = data;

        // ------------------------------------------------------
        // CREATE SLUG
        // ------------------------------------------------------
        const cleanTitle = title.trim();
        const slug = createSlug(cleanTitle);

        // ------------------------------------------------------
        // CHECK DUPLICATE
        // ------------------------------------------------------
        const duplicate =
            await PromotionRepository.findByTitleOrSlug(
                cleanTitle,
                slug
            );

        if (duplicate) {

            const err = new Error(
                "Tiêu đề hoặc slug đã tồn tại"
            );

            err.statusCode = 400;
            err.field = "title";

            throw err;
        }

        // ------------------------------------------------------
        // UPLOAD IMAGE
        // ------------------------------------------------------
        let promotion_image = null;

        if (file) {

            const result = await uploadToCloudinary(
                file,
                "cinema_shop/promotions"
            );

            promotion_image = result.url;
        }

        // ------------------------------------------------------
        // CREATE DATABASE
        // ------------------------------------------------------
        const promotionId =
            await PromotionRepository.create({
                title: cleanTitle,
                slug,
                description: description.trim(),
                promotion_image,
                likes: Number(likes) || 0,
                is_active: 1
            });

        return promotionId;
    }

    /* ==========================================================
        UPDATE PROMOTION
        ADMIN
    ========================================================== */
    async updatePromotion(
        promotionId,
        data,
        file
    ) {

        // ------------------------------------------------------
        // GET EXISTING
        // ------------------------------------------------------
        const promotion =
            await PromotionRepository.findById(
                promotionId
            );

        if (!promotion) {

            const err = new Error(
                "Khuyến mãi không tồn tại"
            );

            err.statusCode = 404;

            throw err;
        }

        // ------------------------------------------------------
        // VALIDATE
        // ------------------------------------------------------
        const error = validatePromotion(
            data,
            file,
            true
        );

        if (error) {

            const err = new Error(error);

            err.statusCode = 400;
            err.field = "general";

            throw err;
        }

        const {
            title,
            description,
            likes,
            is_active
        } = data;

        // ------------------------------------------------------
        // CREATE SLUG
        // ------------------------------------------------------
        const cleanTitle = title.trim();
        const slug = createSlug(cleanTitle);

        // ------------------------------------------------------
        // CHECK DUPLICATE
        // ------------------------------------------------------
        const duplicate =
            await PromotionRepository.findByTitleOrSlug(
                cleanTitle,
                slug,
                promotionId
            );

        if (duplicate) {

            const err = new Error(
                "Tiêu đề hoặc slug đã tồn tại"
            );

            err.statusCode = 400;
            err.field = "title";

            throw err;
        }

        // ------------------------------------------------------
        // KEEP OLD IMAGE IF NO NEW IMAGE
        // ------------------------------------------------------
        let promotionImage =
            promotion.promotion_image;

        // ------------------------------------------------------
        // NEW STATUS
        // ------------------------------------------------------
        const finalIsActive =
            is_active !== undefined &&
            is_active !== ""
                ? Number(is_active)
                : Number(promotion.is_active);

        // ------------------------------------------------------
        // GET CONNECTION
        // ------------------------------------------------------
        const connection =
            await PromotionRepository.getConnection();

        try {

            await PromotionRepository.beginTransaction(
                connection
            );

            // --------------------------------------------------
            // HANDLE IMAGE
            // --------------------------------------------------
            if (file) {

                // Xóa ảnh cũ trên Cloudinary
                if (promotion.promotion_image) {

                    const publicId =
                        extractPublicId(
                            promotion.promotion_image
                        );

                    if (publicId) {
                        await deleteFromCloudinary(
                            publicId
                        );
                    }
                }

                // Upload ảnh mới
                const result =
                    await uploadToCloudinary(
                        file,
                        "cinema_shop/promotions"
                    );

                promotionImage = result.url;
            }

            // --------------------------------------------------
            // UPDATE DATABASE
            // --------------------------------------------------
            const affectedRows =
                await PromotionRepository.updateWithConnection(
                    connection,
                    promotionId,
                    {
                        title: cleanTitle,
                        slug,
                        description: description.trim(),
                        promotion_image: promotionImage,
                        likes: Number(likes) || 0,
                        is_active: finalIsActive
                    }
                );

            if (affectedRows === 0) {

                const err = new Error(
                    "Không thể cập nhật khuyến mãi"
                );

                err.statusCode = 500;

                throw err;
            }

            // --------------------------------------------------
            // COMMIT
            // --------------------------------------------------
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
        DELETE PROMOTION
        ADMIN
    ========================================================== */
    async deletePromotion(promotionId) {

        // ------------------------------------------------------
        // GET EXISTING
        // ------------------------------------------------------
        const promotion =
            await PromotionRepository.findById(
                promotionId
            );

        if (!promotion) {

            const err = new Error(
                "Khuyến mãi không tồn tại"
            );

            err.statusCode = 404;

            throw err;
        }

        // ------------------------------------------------------
        // GET CONNECTION
        // ------------------------------------------------------
        const connection =
            await PromotionRepository.getConnection();

        try {

            await PromotionRepository.beginTransaction(
                connection
            );

            // --------------------------------------------------
            // DELETE CLOUDINARY IMAGE
            // --------------------------------------------------
            if (promotion.promotion_image) {

                const publicId =
                    extractPublicId(
                        promotion.promotion_image
                    );

                if (publicId) {
                    await deleteFromCloudinary(
                        publicId
                    );
                }
            }

            // --------------------------------------------------
            // DELETE DATABASE
            // --------------------------------------------------
            const affectedRows =
                await PromotionRepository.deleteWithConnection(
                    connection,
                    promotionId
                );

            if (affectedRows === 0) {

                const err = new Error(
                    "Xóa khuyến mãi thất bại"
                );

                err.statusCode = 500;

                throw err;
            }

            // --------------------------------------------------
            // COMMIT
            // --------------------------------------------------
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
        LIKE PROMOTION
        PUBLIC
    ========================================================== */
    async likePromotion(promotionId) {

        const affected =
            await PromotionRepository.incrementLikes(
                promotionId
            );

        if (affected === 0) {

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
        ADMIN
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
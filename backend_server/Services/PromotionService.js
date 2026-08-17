const PromotionRepository = require('../Repositories/PromotionRepository');

const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');


// =========================================================
// HELPER - TẠO SLUG
// =========================================================
const createSlug = (title) => {

    if (!title) {
        return "";
    }

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

    if (!url) {
        return null;
    }

    const parts = url.split('/');

    const uploadIndex =
        parts.indexOf('upload');

    if (uploadIndex === -1) {
        return null;
    }

    return parts
        .slice(uploadIndex + 1)
        .join('/')
        .split('.')[0];
};


// =========================================================
// VALIDATE PROMOTION DATA
// =========================================================
const validatePromotionData = (
    data,
    files,
    isUpdate = false
) => {

    const {
        title,
        description,
        likes,
        is_active
    } = data;


    if (
        !title ||
        title.trim() === ""
    ) {

        return "Vui lòng nhập tiêu đề khuyến mãi.";
    }


    if (
        title.trim().length < 5
    ) {

        return "Tiêu đề khuyến mãi phải từ 5 ký tự trở lên.";
    }


    if (
        !description ||
        description.trim() === ""
    ) {

        return "Vui lòng nhập mô tả khuyến mãi.";
    }


    if (
        description.trim().length < 10
    ) {

        return "Mô tả khuyến mãi phải từ 10 ký tự trở lên.";
    }


    if (
        likes !== undefined &&
        likes !== ""
    ) {

        const parsedLikes = Number(likes);

        if (
            !Number.isInteger(parsedLikes) ||
            parsedLikes < 0
        ) {

            return "Likes không hợp lệ.";
        }
    }


    if (
        !isUpdate &&
        (
            !files ||
            !files['promotion_image']
        )
    ) {

        return "Vui lòng upload ảnh cho khuyến mãi.";
    }


    return null;
};


class PromotionService {


    /*=========================================================
        GET ALL PROMOTIONS - KHÔNG PHÂN TRANG

        Repository:
            rows[]

        Service:
            rows[]

        Controller:
            {
                success: true,
                data: []
            }
    =========================================================*/
    async getAllPromotionsAll(search = "") {

        return await PromotionRepository.findAllAll(
            search
        );
    }


    /*=========================================================
        GET ALL PROMOTIONS - CÓ PHÂN TRANG

        Repository:
            {
                data: [],
                pagination: {}
            }

        Service giữ nguyên cấu trúc này.

        Controller sẽ tách thành:
            {
                success: true,
                data: [],
                pagination: {}
            }
    =========================================================*/
    async getAllPromotions(
        page = 1,
        limit = 20,
        search = ""
    ) {

        return await PromotionRepository.findAll(
            page,
            limit,
            search
        );
    }


    /*=========================================================
        GET PROMOTION BY ID
    =========================================================*/
    async getPromotionById(promotionId) {

        const promotion =
            await PromotionRepository.findById(
                promotionId
            );


        if (!promotion) {

            throw {
                statusCode: 404,
                message: "Không tìm thấy khuyến mãi"
            };
        }


        return promotion;
    }


    /*=========================================================
        GET PROMOTION BY SLUG
    =========================================================*/
    async getPromotionBySlug(slug) {

        const promotion =
            await PromotionRepository.findBySlug(
                slug
            );


        if (!promotion) {

            throw {
                statusCode: 404,
                message: "Không tìm thấy khuyến mãi"
            };
        }


        // Tăng lượt xem
        await PromotionRepository.incrementViews(
            promotion.promotion_id
        );


        return promotion;
    }


    /*=========================================================
        CREATE PROMOTION
    =========================================================*/
    async createPromotion(
        data,
        files
    ) {

        const error =
            validatePromotionData(
                data,
                files,
                false
            );


        if (error) {

            throw {
                statusCode: 400,
                field: "general",
                message: error
            };
        }


        const {
            title,
            description,
            likes,
            is_active
        } = data;


        const slug =
            createSlug(title);


        const exists =
            await PromotionRepository.existsByTitleOrSlug(
                title.trim(),
                slug
            );


        if (exists) {

            throw {
                statusCode: 400,
                field: "title",
                message:
                    "Khuyến mãi này đã tồn tại trong hệ thống (trùng tên hoặc slug)."
            };
        }


        let promotion_image = null;
        let promotion_backdrop = null;


        if (
            files['promotion_image']?.[0]
        ) {

            const result =
                await uploadToCloudinary(
                    files['promotion_image'][0],
                    'cinema_shop/promotions'
                );


            promotion_image =
                result.url;
        }


        if (
            files['promotion_backdrop']?.[0]
        ) {

            const result =
                await uploadToCloudinary(
                    files['promotion_backdrop'][0],
                    'cinema_shop/promotions/backdrops'
                );


            promotion_backdrop =
                result.url;
        }


        const promotionId =
            await PromotionRepository.create({

                title:
                    title.trim(),

                slug,

                description:
                    description.trim(),

                promotion_image,

                promotion_backdrop,

                likes:
                    parseInt(
                        likes,
                        10
                    ) || 0,

                is_active:
                    is_active !== undefined
                        ? Number(is_active)
                        : 1

            });


        return promotionId;
    }


    /*=========================================================
        UPDATE PROMOTION
    =========================================================*/
    async updatePromotion(
        promotionId,
        data,
        files
    ) {

        const existing =
            await PromotionRepository.findById(
                promotionId
            );


        if (!existing) {

            throw {
                statusCode: 404,
                message: "Khuyến mãi không tồn tại"
            };
        }


        const error =
            validatePromotionData(
                data,
                files,
                true
            );


        if (error) {

            throw {
                statusCode: 400,
                field: "general",
                message: error
            };
        }


        const {
            title,
            description,
            likes,
            is_active
        } = data;


        const slug =
            createSlug(title);


        const exists =
            await PromotionRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                promotionId
            );


        if (exists) {

            throw {
                statusCode: 400,
                field: "title",
                message:
                    "Tên khuyến mãi hoặc slug đã trùng với khuyến mãi khác."
            };
        }


        let finalImage =
            existing.promotion_image;

        let finalBackdrop =
            existing.promotion_backdrop;


        if (
            files['promotion_image']?.[0]
        ) {

            if (
                existing.promotion_image
            ) {

                const publicId =
                    extractPublicId(
                        existing.promotion_image
                    );


                await deleteFromCloudinary(
                    publicId
                );
            }


            const result =
                await uploadToCloudinary(
                    files['promotion_image'][0],
                    'cinema_shop/promotions'
                );


            finalImage =
                result.url;
        }


        if (
            files['promotion_backdrop']?.[0]
        ) {

            if (
                existing.promotion_backdrop
            ) {

                const publicId =
                    extractPublicId(
                        existing.promotion_backdrop
                    );


                await deleteFromCloudinary(
                    publicId
                );
            }


            const result =
                await uploadToCloudinary(
                    files['promotion_backdrop'][0],
                    'cinema_shop/promotions/backdrops'
                );


            finalBackdrop =
                result.url;
        }


        const updateData = {

            title:
                title.trim(),

            slug,

            description:
                description.trim(),

            promotion_image:
                finalImage,

            promotion_backdrop:
                finalBackdrop,

            likes:
                parseInt(
                    likes,
                    10
                ) || 0,

            is_active:
                is_active !== undefined
                    ? Number(is_active)
                    : existing.is_active

        };


        const affected =
            await PromotionRepository.update(
                promotionId,
                updateData
            );


        if (
            affected === 0
        ) {

            throw {
                statusCode: 500,
                message:
                    "Không thể cập nhật khuyến mãi"
            };
        }


        return true;
    }


    /*=========================================================
        DELETE PROMOTION
    =========================================================*/
    async deletePromotion(promotionId) {

        const promotion =
            await PromotionRepository.findById(
                promotionId
            );


        if (!promotion) {

            throw {
                statusCode: 404,
                message:
                    "Khuyến mãi không tồn tại"
            };
        }


        if (
            promotion.promotion_image
        ) {

            const publicId =
                extractPublicId(
                    promotion.promotion_image
                );


            await deleteFromCloudinary(
                publicId
            );
        }


        if (
            promotion.promotion_backdrop
        ) {

            const publicId =
                extractPublicId(
                    promotion.promotion_backdrop
                );


            await deleteFromCloudinary(
                publicId
            );
        }


        const affected =
            await PromotionRepository.delete(
                promotionId
            );


        if (
            affected === 0
        ) {

            throw {
                statusCode: 500,
                message:
                    "Xóa khuyến mãi thất bại"
            };
        }


        return true;
    }


    /*=========================================================
        LIKE PROMOTION
    =========================================================*/
    async likePromotion(promotionId) {

        const affected =
            await PromotionRepository.incrementLikes(
                promotionId
            );


        if (
            affected === 0
        ) {

            throw {
                statusCode: 404,
                message:
                    "Khuyến mãi không tồn tại"
            };
        }


        return true;
    }


    /*=========================================================
        TOGGLE STATUS
    =========================================================*/
    async toggleStatus(promotionId) {

        const status =
            await PromotionRepository.toggleStatus(
                promotionId
            );


        if (
            status === null
        ) {

            throw {
                statusCode: 404,
                message:
                    "Khuyến mãi không tồn tại"
            };
        }


        return status;
    }
}


module.exports =
    new PromotionService();
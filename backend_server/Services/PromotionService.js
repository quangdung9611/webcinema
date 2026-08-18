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
// HELPER - CHUẨN HÓA NỘI DUNG
//
// MỤC ĐÍCH:
// - Chuẩn hóa xuống dòng
// - Xóa khoảng trắng thừa đầu/cuối
// - Giữ nguyên các đoạn văn
// - KHÔNG cắt cứng theo số dòng
//
// Việc hiển thị khoảng 4 dòng/đoạn sẽ xử lý
// ở frontend bằng CSS để responsive tốt hơn.
// =========================================================
const normalizeParagraphs = (content) => {

    if (!content) {
        return "";
    }

    if (typeof content !== "string") {
        return content;
    }

    return content
        // Chuẩn hóa Windows line break
        .replace(/\r\n/g, '\n')

        // Chuẩn hóa Mac line break cũ
        .replace(/\r/g, '\n')

        // Xóa khoảng trắng ở đầu/cuối từng dòng
        .split('\n')
        .map(line => line.trim())
        .join('\n')

        // Không cho phép quá 2 dòng trống liên tiếp
        .replace(/\n{3,}/g, '\n\n')

        // Xóa khoảng trắng đầu/cuối toàn bộ nội dung
        .trim();
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


    // =====================================================
    // TITLE
    // =====================================================

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


    // =====================================================
    // DESCRIPTION
    // =====================================================

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


    // =====================================================
    // LIKES
    // =====================================================

    if (
        likes !== undefined &&
        likes !== ""
    ) {

        const parsedLikes =
            Number(likes);

        if (
            !Number.isInteger(parsedLikes) ||
            parsedLikes < 0
        ) {

            return "Likes không hợp lệ.";
        }
    }


    // =====================================================
    // CREATE BẮT BUỘC CÓ ẢNH
    // =====================================================

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


// =========================================================
// CLASS PROMOTION SERVICE
// =========================================================
class PromotionService {


    // =====================================================
    // GET ALL PROMOTIONS - KHÔNG PHÂN TRANG
    //
    // Repository:
    //     rows[]
    //
    // Service:
    //     rows[]
    //
    // Controller:
    //     {
    //         success: true,
    //         data: []
    //     }
    // =====================================================
    async getAllPromotionsAll(search = "") {

        return await PromotionRepository.findAllAll(
            search
        );
    }


    // =====================================================
    // GET ALL PROMOTIONS - CÓ PHÂN TRANG
    //
    // Repository:
    //     {
    //         data: [],
    //         pagination: {}
    //     }
    //
    // Service giữ nguyên cấu trúc.
    // =====================================================
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


    // =====================================================
    // GET PROMOTION BY ID
    // =====================================================
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


    // =====================================================
    // GET PROMOTION BY SLUG
    //
    // Đây là API được CinemaCardDetail sử dụng.
    //
    // Tại đây chuẩn hóa description trước khi trả
    // dữ liệu về frontend.
    // =====================================================
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


        // =================================================
        // CHUẨN HÓA NỘI DUNG
        //
        // Không chia cứng thành 4 dòng.
        //
        // Chỉ đảm bảo dữ liệu:
        // - sạch
        // - giữ paragraph
        // - không có khoảng trắng thừa
        // =================================================

        if (promotion.description) {

            promotion.description =
                normalizeParagraphs(
                    promotion.description
                );
        }


        // =================================================
        // TĂNG LƯỢT XEM
        // =================================================

        await PromotionRepository.incrementViews(
            promotion.promotion_id
        );


        return promotion;
    }


    // =====================================================
    // CREATE PROMOTION
    // =====================================================
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


        // =================================================
        // TẠO SLUG
        // =================================================

        const slug =
            createSlug(title);


        // =================================================
        // KIỂM TRA TRÙNG TITLE / SLUG
        // =================================================

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


        // =================================================
        // IMAGE
        // =================================================

        let promotion_image = null;


        // =================================================
        // BACKDROP
        // =================================================

        let promotion_backdrop = null;


        // =================================================
        // UPLOAD PROMOTION IMAGE
        // =================================================

        if (
            files &&
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


        // =================================================
        // UPLOAD PROMOTION BACKDROP
        // =================================================

        if (
            files &&
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


        // =================================================
        // CHUẨN HÓA DESCRIPTION
        // =================================================

        const normalizedDescription =
            normalizeParagraphs(
                description
            );


        // =================================================
        // CREATE DATABASE
        // =================================================

        const promotionId =
            await PromotionRepository.create({

                title:
                    title.trim(),

                slug,

                description:
                    normalizedDescription,

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


    // =====================================================
    // UPDATE PROMOTION
    // =====================================================
    async updatePromotion(
        promotionId,
        data,
        files
    ) {

        // =================================================
        // LẤY DỮ LIỆU HIỆN TẠI
        // =================================================

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


        // =================================================
        // VALIDATE
        // =================================================

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


        // =================================================
        // TẠO SLUG MỚI
        // =================================================

        const slug =
            createSlug(title);


        // =================================================
        // KIỂM TRA TRÙNG TITLE / SLUG
        //
        // Chỉ kiểm tra nếu title hoặc slug thay đổi.
        // =================================================

        if (
            title.trim() !== existing.title ||
            slug !== existing.slug
        ) {

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
        }


        // =================================================
        // GIỮ IMAGE CŨ NẾU KHÔNG UPLOAD ẢNH MỚI
        // =================================================

        let finalImage =
            existing.promotion_image;


        // =================================================
        // GIỮ BACKDROP CŨ NẾU KHÔNG UPLOAD MỚI
        // =================================================

        let finalBackdrop =
            existing.promotion_backdrop;


        // =================================================
        // UPDATE PROMOTION IMAGE
        // =================================================

        if (
            files &&
            files['promotion_image']?.[0]
        ) {

            // ---------------------------------------------
            // XÓA ẢNH CŨ
            // ---------------------------------------------

            if (
                existing.promotion_image
            ) {

                const publicId =
                    extractPublicId(
                        existing.promotion_image
                    );


                if (publicId) {

                    await deleteFromCloudinary(
                        publicId
                    );
                }
            }


            // ---------------------------------------------
            // UPLOAD ẢNH MỚI
            // ---------------------------------------------

            const result =
                await uploadToCloudinary(
                    files['promotion_image'][0],
                    'cinema_shop/promotions'
                );


            finalImage =
                result.url;
        }


        // =================================================
        // UPDATE PROMOTION BACKDROP
        // =================================================

        if (
            files &&
            files['promotion_backdrop']?.[0]
        ) {

            // ---------------------------------------------
            // XÓA BACKDROP CŨ
            // ---------------------------------------------

            if (
                existing.promotion_backdrop
            ) {

                const publicId =
                    extractPublicId(
                        existing.promotion_backdrop
                    );


                if (publicId) {

                    await deleteFromCloudinary(
                        publicId
                    );
                }
            }


            // ---------------------------------------------
            // UPLOAD BACKDROP MỚI
            // ---------------------------------------------

            const result =
                await uploadToCloudinary(
                    files['promotion_backdrop'][0],
                    'cinema_shop/promotions/backdrops'
                );


            finalBackdrop =
                result.url;
        }


        // =================================================
        // CHUẨN HÓA DESCRIPTION
        // =================================================

        const normalizedDescription =
            normalizeParagraphs(
                description
            );


        // =================================================
        // DATA UPDATE
        // =================================================

        const updateData = {

            title:
                title.trim(),

            slug,

            description:
                normalizedDescription,

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


        // =================================================
        // UPDATE DATABASE
        // =================================================

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


    // =====================================================
    // DELETE PROMOTION
    // =====================================================
    async deletePromotion(
        promotionId
    ) {

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


        // =================================================
        // XÓA PROMOTION IMAGE
        // =================================================

        if (
            promotion.promotion_image
        ) {

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


        // =================================================
        // XÓA PROMOTION BACKDROP
        // =================================================

        if (
            promotion.promotion_backdrop
        ) {

            const publicId =
                extractPublicId(
                    promotion.promotion_backdrop
                );


            if (publicId) {

                await deleteFromCloudinary(
                    publicId
                );
            }
        }


        // =================================================
        // XÓA DATABASE
        // =================================================

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


    // =====================================================
    // LIKE PROMOTION
    // =====================================================
    async likePromotion(
        promotionId
    ) {

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


    // =====================================================
    // TOGGLE STATUS
    // =====================================================
    async toggleStatus(
        promotionId
    ) {

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


// =========================================================
// EXPORT
// =========================================================

module.exports =
    new PromotionService();
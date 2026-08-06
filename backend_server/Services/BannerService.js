
const BannerRepository = require("../Repositories/BannerRepository");

const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../Middlewares/UploadCloudinary");


/* ==========================================================
    EXTRACT CLOUDINARY PUBLIC ID
========================================================== */
const extractPublicId = (url) => {

    if (!url) {
        return null;
    }

    const parts = url.split("/");

    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) {
        return null;
    }

    return parts
        .slice(uploadIndex + 1)
        .join("/")
        .split("?")[0]
        .split(".")[0];
};


/* ==========================================================
    NORMALIZE IS_ACTIVE
========================================================== */
const normalizeActiveStatus = (
    value,
    defaultValue = 1
) => {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return defaultValue;
    }

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    ) {
        return 1;
    }

    if (
        value === false ||
        value === 0 ||
        value === "0" ||
        value === "false"
    ) {
        return 0;
    }

    return defaultValue;
};


/* ==========================================================
    VALIDATE PAGE
========================================================== */
const validatePage = (page) => {

    if (
        page === undefined ||
        page === null ||
        typeof page !== "string" ||
        page.trim() === ""
    ) {

        const err = new Error(
            "Vui lòng chọn vị trí banner."
        );

        err.statusCode = 400;
        err.field = "page";

        throw err;
    }

    return page.trim();
};


class BannerService {

    /* ==========================================================
        GET ALL BANNERS
        KHÔNG PHÂN TRANG

        RETURN:
        [
            {...},
            {...}
        ]

        HỖ TRỢ:
        /api/banners
        /api/banners?search=HOME
        /api/banners?page=HOME
    ========================================================== */
    async getAllBannersAll(
        search = "",
        page = ""
    ) {

        return await BannerRepository.findAllAll(
            search,
            page
        );
    }


    /* ==========================================================
        GET ALL BANNERS
        CÓ PHÂN TRANG
    ========================================================== */
    async getAllBannersPaginated(
        page = 1,
        limit = 20,
        search = ""
    ) {

        return await BannerRepository.findAll(
            false,
            page,
            limit,
            search
        );
    }


    /* ==========================================================
        GET ACTIVE BANNERS BY PAGE
        FRONTEND
    ========================================================== */
    async getActiveBannersByPage(page) {

        page = validatePage(page);

        return await BannerRepository.findActiveByPage(
            page
        );
    }


    /* ==========================================================
        GET BANNER BY ID
    ========================================================== */
    async getBannerById(bannerId) {

        const banner =
            await BannerRepository.findById(
                bannerId
            );

        if (!banner) {

            const err = new Error(
                "Không tìm thấy banner"
            );

            err.statusCode = 404;

            throw err;
        }

        return banner;
    }


    /* ==========================================================
        CREATE BANNER
    ========================================================== */
    async createBanner(data, file) {

        const page = validatePage(data.page);

        if (!file) {

            const err = new Error(
                "Vui lòng chọn file ảnh"
            );

            err.statusCode = 400;
            err.field = "image_url";

            throw err;
        }

        const result =
            await uploadToCloudinary(
                file,
                "cinema_shop/banners"
            );

        if (!result || !result.url) {

            const err = new Error(
                "Upload ảnh banner thất bại"
            );

            err.statusCode = 500;
            err.field = "image_url";

            throw err;
        }

        return await BannerRepository.create({
            page,
            image_url: result.url,
            is_active: 1
        });
    }


    /* ==========================================================
        UPDATE BANNER
    ========================================================== */
    async updateBanner(
        bannerId,
        data,
        file
    ) {

        const banner =
            await BannerRepository.findById(
                bannerId
            );

        if (!banner) {

            const err = new Error(
                "Không tìm thấy banner"
            );

            err.statusCode = 404;

            throw err;
        }

        const updateData = {};


        /* ======================================================
            UPDATE PAGE
        ====================================================== */
        if (data.page !== undefined) {

            updateData.page =
                validatePage(data.page);
        }


        /* ======================================================
            UPDATE STATUS
        ====================================================== */
        if (data.is_active !== undefined) {

            updateData.is_active =
                normalizeActiveStatus(
                    data.is_active,
                    banner.is_active
                );
        }


        /* ======================================================
            UPDATE IMAGE
        ====================================================== */
        if (file) {

            const result =
                await uploadToCloudinary(
                    file,
                    "cinema_shop/banners"
                );

            if (!result || !result.url) {

                const err = new Error(
                    "Upload ảnh banner thất bại"
                );

                err.statusCode = 500;
                err.field = "image_url";

                throw err;
            }

            updateData.image_url =
                result.url;


            /* ==================================================
                XÓA ẢNH CŨ
            ================================================== */
            if (banner.image_url) {

                const publicId =
                    extractPublicId(
                        banner.image_url
                    );

                if (publicId) {

                    try {

                        await deleteFromCloudinary(
                            publicId
                        );

                    } catch (cloudinaryError) {

                        console.error(
                            "Delete old banner image error:",
                            cloudinaryError
                        );
                    }
                }
            }
        }


        /* ======================================================
            CHECK CHANGE
        ====================================================== */
        if (
            Object.keys(updateData).length === 0
        ) {

            const err = new Error(
                "Không có thay đổi nào"
            );

            err.statusCode = 400;

            throw err;
        }


        /* ======================================================
            UPDATE DATABASE
        ====================================================== */
        const affectedRows =
            await BannerRepository.update(
                bannerId,
                updateData
            );

        if (affectedRows === 0) {

            const err = new Error(
                "Cập nhật banner thất bại"
            );

            err.statusCode = 400;

            throw err;
        }

        return true;
    }


    /* ==========================================================
        DELETE BANNER
    ========================================================== */
    async deleteBanner(bannerId) {

        const banner =
            await BannerRepository.findById(
                bannerId
            );

        if (!banner) {

            const err = new Error(
                "Không tìm thấy banner"
            );

            err.statusCode = 404;

            throw err;
        }


        /* ======================================================
            DELETE CLOUDINARY IMAGE
        ====================================================== */
        if (banner.image_url) {

            const publicId =
                extractPublicId(
                    banner.image_url
                );

            if (publicId) {

                try {

                    await deleteFromCloudinary(
                        publicId
                    );

                } catch (cloudinaryError) {

                    console.error(
                        "Delete banner image error:",
                        cloudinaryError
                    );
                }
            }
        }


        /* ======================================================
            DELETE DATABASE
        ====================================================== */
        const affectedRows =
            await BannerRepository.delete(
                bannerId
            );

        if (affectedRows === 0) {

            const err = new Error(
                "Xóa banner thất bại"
            );

            err.statusCode = 500;

            throw err;
        }

        return true;
    }
}


module.exports = new BannerService();


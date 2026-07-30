/*=========================================================
    DEPENDENCIES
=========================================================*/

const BannerRepository = require("../Repositories/BannerRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

/*=========================================================
    BANNER SERVICE
=========================================================*/

class BannerService {

    /*=========================================================
        GET ALL BANNERS (cho admin)
    =========================================================*/
    async getAllBanners() {
        return await BannerRepository.findAll();
    }

    /*=========================================================
        GET BANNER BY ID
    =========================================================*/
    async getBannerById(bannerId) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy banner"
            };
        }
        return banner;
    }

    /*=========================================================
        GET ACTIVE BANNER BY PAGE (is_active = 1)
    =========================================================*/
    async getActiveBannerByPage(page) {
        const banner = await BannerRepository.findActiveByPage(page);
        if (!banner) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy banner cho trang này"
            };
        }
        return banner;
    }

    /*=========================================================
        CREATE BANNER (upload file)
    =========================================================*/
    async createBanner(data, file) {
        const { page, is_active } = data;

        if (!page) {
            throw { statusCode: 400, field: "page", message: "Thiếu page" };
        }

        // Upload file lên Cloudinary
        if (!file) {
            throw { statusCode: 400, field: "image", message: "Vui lòng chọn file ảnh" };
        }

        const result = await uploadToCloudinary(file, 'cinema_shop/banners');
        const imageUrl = result.url;

        // Nếu banner mới active, deactive tất cả banner cũ của page đó
        const active = is_active !== undefined ? parseInt(is_active) : 1;
        if (active === 1) {
            await BannerRepository.deactivateAllByPage(page);
        }

        const bannerId = await BannerRepository.create({
            page,
            image_url: imageUrl,
            is_active: active
        });

        return bannerId;
    }

    /*=========================================================
        UPDATE BANNER (có thể upload file mới)
    =========================================================*/
    async updateBanner(bannerId, data, file) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

        // Xử lý upload ảnh mới nếu có file
        let imageUrl = banner.image_url;
        if (file) {
            // Xóa ảnh cũ trên Cloudinary
            if (banner.image_url) {
                const urlParts = banner.image_url.split('/');
                const publicId = urlParts.slice(7).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(file, 'cinema_shop/banners');
            imageUrl = result.url;
        }

        // Xác định page và is_active mới
        const newPage = data.page || banner.page;
        let newActive = data.is_active !== undefined ? parseInt(data.is_active) : banner.is_active;

        // Nếu active = 1, deactive tất cả banner khác cùng page
        if (newActive === 1) {
            await BannerRepository.deactivateAllByPage(newPage);
        }

        // Chuẩn bị dữ liệu update
        const updateData = {};
        if (data.page !== undefined) updateData.page = data.page;
        if (file) updateData.image_url = imageUrl;
        if (data.is_active !== undefined) updateData.is_active = newActive;

        if (Object.keys(updateData).length === 0) {
            throw { statusCode: 400, message: "Không có thay đổi nào" };
        }

        const affectedRows = await BannerRepository.update(bannerId, updateData);
        if (affectedRows === 0) {
            throw { statusCode: 400, message: "Cập nhật thất bại" };
        }

        return true;
    }

    /*=========================================================
        DELETE BANNER (xóa cả file trên Cloudinary)
    =========================================================*/
    async deleteBanner(bannerId) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

        // Xóa ảnh trên Cloudinary
        if (banner.image_url) {
            const urlParts = banner.image_url.split('/');
            const publicId = urlParts.slice(7).join('/').split('.')[0];
            await deleteFromCloudinary(publicId);
        }

        const affectedRows = await BannerRepository.delete(bannerId);
        if (affectedRows === 0) {
            throw { statusCode: 500, message: "Xóa banner thất bại" };
        }

        return true;
    }
}

module.exports = new BannerService();
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
        GET ALL BANNERS
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
        GET ALL ACTIVE BANNERS BY PAGE (trả về mảng)
    =========================================================*/
    async getBannerByPage(page) {
        const banners = await BannerRepository.findActiveByPage(page);
        if (!banners || banners.length === 0) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy banner cho trang này"
            };
        }
        return banners; // Trả về mảng
    }

    /*=========================================================
        CREATE BANNER
    =========================================================*/
    async createBanner(data, file) {
        const { page, is_active } = data;

        if (!page) {
            throw { statusCode: 400, field: "page", message: "Thiếu page" };
        }

        let imageUrl = null;
        if (file) {
            const result = await uploadToCloudinary(file, 'cinema_shop/banners');
            imageUrl = result.url;
        } else {
            throw { statusCode: 400, field: "image_url", message: "Vui lòng chọn file ảnh" };
        }

        const bannerId = await BannerRepository.create({
            page,
            image_url: imageUrl,
            is_active: is_active !== false ? 1 : 0
        });

        return bannerId;
    }

    /*=========================================================
        UPDATE BANNER
    =========================================================*/
    async updateBanner(bannerId, data, file) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

        // Xử lý upload ảnh mới nếu có file
        let imageUrl = banner.image_url;
        if (file) {
            if (banner.image_url) {
                const urlParts = banner.image_url.split('/');
                const publicId = urlParts.slice(7).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
            const result = await uploadToCloudinary(file, 'cinema_shop/banners');
            imageUrl = result.url;
            data.image_url = imageUrl;
        }

        // Lọc các trường cần update
        const updateData = {};
        if (data.page !== undefined) updateData.page = data.page;
        if (data.image_url !== undefined) updateData.image_url = data.image_url;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

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
        DELETE BANNER
    =========================================================*/
    async deleteBanner(bannerId) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

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
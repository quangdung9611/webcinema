const BannerRepository = require("../Repositories/BannerRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

class BannerService {

    // ==========================================================
    // GET ALL BANNERS (Admin & Public) - PAGINATION + SEARCH
    // ==========================================================
    async getAllBanners(onlyActive = false, page = 1, limit = 20, search = "") {
        return await BannerRepository.findAll(onlyActive, page, limit, search);
    }

    // ==========================================================
    // GET BANNER BY ID
    // ==========================================================
    async getBannerById(bannerId) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }
        return banner;
    }

    // ==========================================================
    // CREATE BANNER
    // ==========================================================
    async createBanner(data, file) {
        const { page, is_active } = data;
        if (!page) {
            throw { statusCode: 400, field: "page", message: "Thiếu page" };
        }
        if (!file) {
            throw { statusCode: 400, field: "image_url", message: "Vui lòng chọn file ảnh" };
        }

        const result = await uploadToCloudinary(file, 'cinema_shop/banners');
        const imageUrl = result.url;

        return await BannerRepository.create({
            page,
            image_url: imageUrl,
            is_active: is_active !== false ? 1 : 0
        });
    }

    // ==========================================================
    // UPDATE BANNER
    // ==========================================================
    async updateBanner(bannerId, data, file) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

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

    // ==========================================================
    // DELETE BANNER
    // ==========================================================
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
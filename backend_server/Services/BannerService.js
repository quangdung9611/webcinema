/*=========================================================
    DEPENDENCIES
=========================================================*/

const BannerRepository = require("../Repositories/BannerRepository");

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
        GET BANNER BY PAGE (chỉ trả về active)
    =========================================================*/
    async getBannerByPage(page) {
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
        CREATE BANNER
    =========================================================*/
    async createBanner(data) {
        const { page, image_url, is_active } = data;

        if (!page) {
            throw { statusCode: 400, field: "page", message: "Thiếu page" };
        }
        if (!image_url) {
            throw { statusCode: 400, field: "image_url", message: "Thiếu image_url" };
        }

        // Nếu banner mới active, deactive tất cả banner cũ của page đó
        if (is_active !== false) {
            await BannerRepository.deactivateAllByPage(page);
        }

        const bannerId = await BannerRepository.create({
            page,
            image_url,
            is_active: is_active !== false ? 1 : 0
        });

        return bannerId;
    }

    /*=========================================================
        UPDATE BANNER
    =========================================================*/
    async updateBanner(bannerId, data) {
        const banner = await BannerRepository.findById(bannerId);
        if (!banner) {
            throw { statusCode: 404, message: "Không tìm thấy banner" };
        }

        // Nếu cập nhật active = true và có thay đổi page hoặc is_active
        const willBeActive = data.is_active !== undefined ? data.is_active : banner.is_active;
        const newPage = data.page || banner.page;

        if (willBeActive && (data.is_active !== undefined || data.page)) {
            // Deactive tất cả banner khác cùng page (trừ banner hiện tại)
            await BannerRepository.deactivateAllByPage(newPage);
            // Sau đó sẽ update banner này thành active
            data.is_active = 1;
        }

        const affectedRows = await BannerRepository.update(bannerId, data);
        if (affectedRows === 0) {
            throw { statusCode: 400, message: "Không có thay đổi nào" };
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

        const affectedRows = await BannerRepository.delete(bannerId);
        if (affectedRows === 0) {
            throw { statusCode: 500, message: "Xóa banner thất bại" };
        }

        return true;
    }
}

module.exports = new BannerService();
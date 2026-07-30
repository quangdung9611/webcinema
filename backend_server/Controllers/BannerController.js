/*=========================================================
    DEPENDENCIES
=========================================================*/

const BannerService = require("../Services/BannerService");

/*=========================================================
    PUBLIC - GET BANNER (có page hoặc tất cả)
=========================================================*/

exports.getBannerByPage = async (req, res) => {
    try {
        const { page } = req.query;

        if (page) {
            const banners = await BannerService.getBannerByPage(page);
            return res.status(200).json({
                success: true,
                data: banners // Trả về mảng
            });
        }

        const banners = await BannerService.getAllBanners();
        return res.status(200).json({
            success: true,
            data: banners
        });
    } catch (err) {
        console.error("Get Banner Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET BANNER BY ID
=========================================================*/

exports.getBannerById = async (req, res) => {
    try {
        const { banner_id } = req.params;
        const banner = await BannerService.getBannerById(banner_id);
        return res.status(200).json({
            success: true,
            data: banner
        });
    } catch (err) {
        console.error("Get Banner By ID Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - CREATE BANNER
=========================================================*/

exports.createBanner = async (req, res) => {
    try {
        const bannerId = await BannerService.createBanner(req.body, req.file);
        return res.status(201).json({
            success: true,
            message: "Tạo banner thành công",
            data: { banner_id: bannerId }
        });
    } catch (err) {
        console.error("Create Banner Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE BANNER
=========================================================*/

exports.updateBanner = async (req, res) => {
    try {
        const { banner_id } = req.params;
        await BannerService.updateBanner(banner_id, req.body, req.file);
        return res.status(200).json({
            success: true,
            message: "Cập nhật banner thành công"
        });
    } catch (err) {
        console.error("Update Banner Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - DELETE BANNER
=========================================================*/

exports.deleteBanner = async (req, res) => {
    try {
        const { banner_id } = req.params;
        await BannerService.deleteBanner(banner_id);
        return res.status(200).json({
            success: true,
            message: "Xóa banner thành công"
        });
    } catch (err) {
        console.error("Delete Banner Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
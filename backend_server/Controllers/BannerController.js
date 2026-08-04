const BannerService = require("../Services/BannerService");

/*=========================================================
    PUBLIC - GET ALL BANNERS (Active, Pagination + Search)
=========================================================*/
exports.getAllBannersPublic = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await BannerService.getAllBanners(true, page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Public Banners Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET ALL BANNERS (Pagination + Search)
=========================================================*/
exports.getAllBannersAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await BannerService.getAllBanners(false, page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Admin Banners Error:", err);
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
        return res.status(200).json({ success: true, data: banner });
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
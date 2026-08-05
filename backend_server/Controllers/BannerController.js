const BannerService = require("../Services/BannerService");

/*=========================================================
    PUBLIC/ADMIN - GET ALL BANNERS (KHÔNG PHÂN TRANG)
=========================================================*/
/*=========================================================
    PUBLIC/ADMIN - GET ALL BANNERS (KHÔNG PHÂN TRANG, HỖ TRỢ PAGE KEY)
=========================================================*/
exports.getAllBannersAll = async (req, res) => {
    try {
        // Lấy tham số search và page từ query (page có thể là "HOME", "PROMOTION"...)
        const { search = "", page = "" } = req.query;
        
        // 🛑 Chỉ chặn nếu người dùng truyền tham số limit vào route này
        if (req.query.limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/banners không hỗ trợ phân trang. Vui lòng sử dụng /api/banners/paginated để phân trang."
            });
        }

        // Gọi Service và truyền thêm tham số page vào
        const data = await BannerService.getAllBannersAll(search, page);
        
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get All Banners Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
/*=========================================================
    ADMIN - GET BANNERS WITH PAGINATION
=========================================================*/
exports.getBannersWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const data = await BannerService.getAllBannersPaginated(page, limit, search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get Banners Paginated Error:", err);
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
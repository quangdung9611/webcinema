const BannerService = require("../Services/BannerService");

/**
 * GET /api/banners
 * Không phân trang → data là mảng
 */
exports.getAllBannersAll = async (req, res) => {
  try {
    const { search = "", page = "" } = req.query;

    if (req.query.limit !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Route /api/banners không hỗ trợ phân trang. Vui lòng sử dụng /api/banners/paginated"
      });
    }

    const data = await BannerService.getAllBannersAll(search, page);

    return res.status(200).json({
      success: true,
      data // mảng
    });
  } catch (err) {
    console.error("Get All Banners Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ"
    });
  }
};

/**
 * GET /api/banners/paginated
 * Có phân trang → data là mảng, pagination là key riêng
 */
exports.getBannersWithPagination = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const result = await BannerService.getAllBannersPaginated(page, limit, search);

    return res.status(200).json({
      success: true,
      data: result.data,        // mảng
      pagination: result.pagination // object
    });
  } catch (err) {
    console.error("Get Banners Paginated Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ"
    });
  }
};

/**
 * GET /api/banners/:banner_id
 */
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

/**
 * POST /api/banners
 */
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

/**
 * PUT /api/banners/:banner_id
 */
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

/**
 * DELETE /api/banners/:banner_id
 */
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
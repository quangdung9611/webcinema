const PromotionService = require("../Services/PromotionService");

exports.getAllPromotions = async (req, res) => {
  try {
    const data = await PromotionService.getAllPromotions(true);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getAllPromotionsAdmin = async (req, res) => {
  try {
    const data = await PromotionService.getAllPromotions(false);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getPromotionById = async (req, res) => {
  try {
    const { promotion_id } = req.params;
    const p = await PromotionService.getPromotionById(promotion_id);
    return res.status(200).json(p);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getPromotionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const p = await PromotionService.getPromotionBySlug(slug);
    return res.status(200).json(p);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const id = await PromotionService.createPromotion(req.body, req.file);
    return res.status(201).json({
      success: true,
      message: "Tạo khuyến mãi thành công",
      data: { promotion_id: id },
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const { promotion_id } = req.params;
    await PromotionService.updatePromotion(promotion_id, req.body, req.file);
    return res.status(200).json({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const { promotion_id } = req.params;
    await PromotionService.deletePromotion(promotion_id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa khuyến mãi thành công",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.increaseLike = async (req, res) => {
  try {
    const { promotion_id } = req.params; // ✅ sửa
    await PromotionService.likePromotion(promotion_id);
    return res.status(200).json({
      success: true,
      message: "Like +1 thành công",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.togglePromotionStatus = async (req, res) => {
  try {
    const { promotion_id } = req.params; // ✅ sửa
    const newStatus = await PromotionService.toggleStatus(promotion_id);
    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      is_active: newStatus,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
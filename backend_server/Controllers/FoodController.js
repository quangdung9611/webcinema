const FoodService = require("../Services/FoodService");

exports.getAllFoods = async (req, res) => {
  try {
    const data = await FoodService.getAllFoods();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Get all foods error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getFoodById = async (req, res) => {
  try {
    const { product_id } = req.params; // ✅ sửa
    const data = await FoodService.getFoodById(product_id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Get food by id error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.createFood = async (req, res) => {
  try {
    const productId = await FoodService.createFood(req.body, req.file);
    return res.status(201).json({
      success: true,
      message: "Thêm món ăn thành công",
      product_id: productId,
    });
  } catch (err) {
    console.error("Create food error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updateFood = async (req, res) => {
  try {
    const { product_id } = req.params; // ✅ sửa
    await FoodService.updateFood(product_id, req.body, req.file);
    return res.status(200).json({
      success: true,
      message: "Cập nhật món ăn thành công",
    });
  } catch (err) {
    console.error("Update food error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deleteFood = async (req, res) => {
  try {
    const { product_id } = req.params; // ✅ sửa
    await FoodService.deleteFood(product_id);
    return res.status(200).json({
      success: true,
      message: "Xóa món ăn thành công",
    });
  } catch (err) {
    console.error("Delete food error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
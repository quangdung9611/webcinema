const FoodRepository = require("../Repositories/FoodRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const uploadIndex = parts.indexOf("upload");
  if (uploadIndex === -1) return null;
  return parts.slice(uploadIndex + 1).join("/").split(".")[0];
};

const validateFood = (data, file, isUpdate = false) => {
  const { product_name, price } = data;

  if (!product_name || product_name.trim() === "") {
    return "Tên món ăn không được để trống";
  }
  if (!price || Number(price) <= 0) {
    return "Giá món ăn phải lớn hơn 0";
  }
  if (!isUpdate && !file) {
    return "Vui lòng upload hình ảnh sản phẩm";
  }
  return null;
};

class FoodService {
  async getAllFoods() {
    return await FoodRepository.findAll();
  }

  async getFoodById(id) {
    const food = await FoodRepository.findById(id);
    if (!food) {
      const err = new Error("Không tìm thấy món ăn");
      err.statusCode = 404;
      throw err;
    }
    return food;
  }

  async createFood(data, file) {
    const { product_name, price, category, status } = data;

    const error = validateFood(data, file, false);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = product_name.trim();
    const dup = await FoodRepository.findByName(name);
    if (dup) {
      const err = new Error("Tên món ăn đã tồn tại");
      err.statusCode = 409;
      throw err;
    }

    let food_image = null;
    if (file) {
      const result = await uploadToCloudinary(file, "cinema_shop/foods");
      food_image = result.url;
    }

    return await FoodRepository.create({
      product_name: name,
      price: Number(price),
      food_image,
      category: category || "Other",
      status: status ?? 1,
    });
  }

  async updateFood(id, data, file) {
    const existing = await FoodRepository.findById(id);
    if (!existing) {
      const err = new Error("Món ăn không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    const { product_name, price, category, status } = data;

    const error = validateFood(data, file, true);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = product_name.trim();
    const dup = await FoodRepository.findByName(name, id);
    if (dup) {
      const err = new Error("Tên món ăn đã tồn tại");
      err.statusCode = 409;
      throw err;
    }

    // Xử lý ảnh
    let food_image = existing.food_image;
    if (file) {
      if (existing.food_image) {
        const publicId = extractPublicId(existing.food_image);
        await deleteFromCloudinary(publicId);
      }
      const result = await uploadToCloudinary(file, "cinema_shop/foods");
      food_image = result.url;
    }

    await FoodRepository.update(id, {
      product_name: name,
      price: Number(price),
      food_image,
      category: category || "Other",
      status: status ?? 1,
    });

    return true;
  }

  async deleteFood(id) {
    const existing = await FoodRepository.findById(id);
    if (!existing) {
      const err = new Error("Món ăn không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    if (existing.food_image) {
      const publicId = extractPublicId(existing.food_image);
      await deleteFromCloudinary(publicId);
    }

    await FoodRepository.delete(id);
    return true;
  }
}

module.exports = new FoodService();
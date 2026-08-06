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
    if (!product_name || product_name.trim() === "") return "Tên món ăn không được để trống";
    if (!price || Number(price) <= 0) return "Giá món ăn phải lớn hơn 0";
    if (!isUpdate && !file) return "Vui lòng upload hình ảnh sản phẩm";
    return null;
};

class FoodService {

    /*=========================================================
        GET ALL FOODS - KHÔNG PHÂN TRANG
        RETURN: rows[] (trực tiếp từ repository)
    =========================================================*/
    async getAllFoodsAll(search = "") {
        return await FoodRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL FOODS - CÓ PHÂN TRANG
        RETURN: { data: [], pagination: {} }
    =========================================================*/
    async getAllFoodsPaginated(page = 1, limit = 20, search = "") {
        return await FoodRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET FOOD BY ID
    =========================================================*/
    async getFoodById(productId) {
        const food = await FoodRepository.findById(productId);
        if (!food) {
            const err = new Error("Không tìm thấy món ăn");
            err.statusCode = 404;
            throw err;
        }
        return food;
    }

    /*=========================================================
        CREATE FOOD
    =========================================================*/
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
            err.field = "product_name";
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

    /*=========================================================
        UPDATE FOOD
    =========================================================*/
    async updateFood(productId, data, file) {
        const existing = await FoodRepository.findById(productId);
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
        const dup = await FoodRepository.findByName(name, productId);
        if (dup) {
            const err = new Error("Tên món ăn đã tồn tại");
            err.statusCode = 409;
            err.field = "product_name";
            throw err;
        }

        let food_image = existing.food_image;
        if (file) {
            if (existing.food_image) {
                const publicId = extractPublicId(existing.food_image);
                await deleteFromCloudinary(publicId);
            }
            const result = await uploadToCloudinary(file, "cinema_shop/foods");
            food_image = result.url;
        }

        await FoodRepository.update(productId, {
            product_name: name,
            price: Number(price),
            food_image,
            category: category || "Other",
            status: status ?? 1,
        });

        return true;
    }

    /*=========================================================
        DELETE FOOD
    =========================================================*/
    async deleteFood(productId) {
        const existing = await FoodRepository.findById(productId);
        if (!existing) {
            const err = new Error("Món ăn không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        if (existing.food_image) {
            const publicId = extractPublicId(existing.food_image);
            await deleteFromCloudinary(publicId);
        }

        await FoodRepository.delete(productId);
        return true;
    }
}

module.exports = new FoodService();
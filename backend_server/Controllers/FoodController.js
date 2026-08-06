const FoodService = require("../Services/FoodService");

/*=========================================================
    PUBLIC/ADMIN - GET ALL FOODS (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllFoodsAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        // Không cho phép page / limit trên API không phân trang
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/foods không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/foods/paginated để phân trang."
            });
        }

        // Service trả về thẳng rows[]
        const data = await FoodService.getAllFoodsAll(search);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get All Foods Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC/ADMIN - GET FOODS WITH PAGINATION
=========================================================*/
exports.getFoodsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const result = await FoodService.getAllFoodsPaginated(page, limit, search);

        // Service trả về { data: [], pagination: {} }
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("Get Foods Paginated Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET FOOD BY ID
=========================================================*/
exports.getFoodById = async (req, res) => {
    try {
        const { product_id } = req.params;
        const data = await FoodService.getFoodById(product_id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get food by id error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - CREATE FOOD
=========================================================*/
exports.createFood = async (req, res) => {
    try {
        const productId = await FoodService.createFood(req.body, req.file);
        return res.status(201).json({
            success: true,
            message: "Thêm món ăn thành công",
            data: { product_id: productId }
        });
    } catch (err) {
        console.error("Create food error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE FOOD
=========================================================*/
exports.updateFood = async (req, res) => {
    try {
        const { product_id } = req.params;
        await FoodService.updateFood(product_id, req.body, req.file);
        return res.status(200).json({
            success: true,
            message: "Cập nhật món ăn thành công"
        });
    } catch (err) {
        console.error("Update food error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - DELETE FOOD
=========================================================*/
exports.deleteFood = async (req, res) => {
    try {
        const { product_id } = req.params;
        await FoodService.deleteFood(product_id);
        return res.status(200).json({
            success: true,
            message: "Xóa món ăn thành công"
        });
    } catch (err) {
        console.error("Delete food error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
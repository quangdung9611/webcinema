const db = require('../Config/db'); 

const FoodController = {
    // Lấy danh sách bắp nước để hiện lên trang chọn món
    getAllFoods: async (req, res) => {
        try {
            // Chỉ lấy các cột đang có thực tế trong bảng của ông
            const query = "SELECT product_id, product_name, price, food_image FROM product_menu";
            
            const [foods] = await db.query(query);
            
            // Trả về JSON để ông test trên trình duyệt hoặc gọi từ React
            res.status(200).json(foods);

        } catch (err) {
            console.error("❌ Lỗi tại FoodController:", err.message);
            res.status(500).json({ 
                success: false, 
                message: "Lỗi kết nối database",
                error: err.message 
            });
        }
    }
};

module.exports = FoodController;
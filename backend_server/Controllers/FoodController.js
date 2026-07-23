const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* =====================================================
    HELPERS
===================================================== */

/**
 * Xóa file vật lý trong thư mục uploads/foods
 */
const deleteFoodImage = (fileName) => {
    if (!fileName) return;

    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'foods', pureFileName);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Đã xóa file food: ${pureFileName}`);
        }
    } catch (err) {
        console.error('❌ Lỗi xóa file food:', err.message);
    }
};

/* =====================================================
    GET ALL FOODS
===================================================== */

exports.getAllFoods = async (req, res) => {
    try {
        const query = `
            SELECT 
                product_id,
                product_name,
                price,
                food_image,
                category,
                status,
                created_at
            FROM product_menu
            ORDER BY product_id DESC
        `;

        const [foods] = await db.query(query);

        return res.status(200).json({
            success: true,
            count: foods.length,
            data: foods
        });

    } catch (err) {
        console.error('❌ Lỗi getAllFoods:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    GET FOOD BY ID
===================================================== */

exports.getFoodById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                product_id,
                product_name,
                price,
                food_image,
                category,
                status,
                created_at
            FROM product_menu
            WHERE product_id = ?
        `;

        const [foods] = await db.query(query, [id]);

        if (!foods.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy món ăn'
            });
        }

        return res.status(200).json({
            success: true,
            data: foods[0]
        });

    } catch (err) {
        console.error('❌ Lỗi getFoodById:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    CREATE FOOD
===================================================== */

exports.createFood = async (req, res) => {
    try {
        const {
            product_name,
            price,
            category,
            status
        } = req.body;

        // Lấy file từ multer
        const file = req.file;

        // VALIDATE
        if (!product_name || !product_name.trim()) {
            if (file) deleteFoodImage(file.filename);
            return res.status(400).json({
                success: false,
                message: 'Tên món ăn không được để trống'
            });
        }

        if (!price || Number(price) <= 0) {
            if (file) deleteFoodImage(file.filename);
            return res.status(400).json({
                success: false,
                message: 'Giá món ăn phải lớn hơn 0'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng upload hình ảnh sản phẩm'
            });
        }

        const name = product_name.trim();

        // DUPLICATE CHECK
        const [duplicateFood] = await db.query(
            `SELECT product_id 
             FROM product_menu 
             WHERE LOWER(product_name) = LOWER(?)`,
            [name]
        );

        if (duplicateFood.length > 0) {
            deleteFoodImage(file.filename);
            return res.status(409).json({
                success: false,
                message: 'Tên món ăn đã tồn tại'
            });
        }

        // INSERT
        const query = `
            INSERT INTO product_menu (
                product_name,
                price,
                food_image,
                category,
                status
            )
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            name,
            price,
            file.filename,
            category || 'Other',
            status ?? 1
        ]);

        return res.status(201).json({
            success: true,
            message: 'Thêm món ăn thành công',
            product_id: result.insertId
        });

    } catch (err) {
        console.error('❌ Lỗi createFood:', err.message);
        if (req.file) deleteFoodImage(req.file.filename);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    UPDATE FOOD
===================================================== */

exports.updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            product_name,
            price,
            category,
            status
        } = req.body;

        const file = req.file;

        // CHECK EXIST
        const [foodExists] = await db.query(
            `SELECT product_id, food_image 
             FROM product_menu 
             WHERE product_id = ?`,
            [id]
        );

        if (!foodExists.length) {
            if (file) deleteFoodImage(file.filename);
            return res.status(404).json({
                success: false,
                message: 'Món ăn không tồn tại'
            });
        }

        // VALIDATE
        if (!product_name || !product_name.trim()) {
            if (file) deleteFoodImage(file.filename);
            return res.status(400).json({
                success: false,
                message: 'Tên món ăn không được để trống'
            });
        }

        if (!price || Number(price) <= 0) {
            if (file) deleteFoodImage(file.filename);
            return res.status(400).json({
                success: false,
                message: 'Giá món ăn phải lớn hơn 0'
            });
        }

        const name = product_name.trim();

        // DUPLICATE CHECK
        const [duplicateFood] = await db.query(
            `SELECT product_id 
             FROM product_menu 
             WHERE LOWER(product_name) = LOWER(?) 
             AND product_id != ?`,
            [name, id]
        );

        if (duplicateFood.length > 0) {
            if (file) deleteFoodImage(file.filename);
            return res.status(409).json({
                success: false,
                message: 'Tên món ăn đã tồn tại'
            });
        }

        // XỬ LÝ ẢNH
        let food_image = foodExists[0].food_image; // ảnh cũ

        if (file) {
            // Xóa ảnh cũ nếu có
            if (food_image) {
                deleteFoodImage(food_image);
            }
            food_image = file.filename;
        }

        // UPDATE
        const query = `
            UPDATE product_menu
            SET 
                product_name = ?,
                price = ?,
                food_image = ?,
                category = ?,
                status = ?
            WHERE product_id = ?
        `;

        await db.query(query, [
            name,
            price,
            food_image,
            category || 'Other',
            status ?? 1,
            id
        ]);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật món ăn thành công'
        });

    } catch (err) {
        console.error('❌ Lỗi updateFood:', err.message);
        if (req.file) deleteFoodImage(req.file.filename);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    DELETE FOOD
===================================================== */

exports.deleteFood = async (req, res) => {
    try {
        const { id } = req.params;

        // CHECK EXIST & LẤY ẢNH
        const [foodExists] = await db.query(
            `SELECT product_id, food_image 
             FROM product_menu 
             WHERE product_id = ?`,
            [id]
        );

        if (!foodExists.length) {
            return res.status(404).json({
                success: false,
                message: 'Món ăn không tồn tại'
            });
        }

        // Xóa file ảnh
        if (foodExists[0].food_image) {
            deleteFoodImage(foodExists[0].food_image);
        }

        // DELETE
        await db.query(
            `DELETE FROM product_menu WHERE product_id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Xóa món ăn thành công'
        });

    } catch (err) {
        console.error('❌ Lỗi deleteFood:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};
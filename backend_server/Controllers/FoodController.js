const db = require('../Config/db');

// =====================================================
// IMPORT CLOUDINARY HELPERS
// =====================================================
const { uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/UploadCloudinary');

/**
 * Trích xuất public_id từ URL Cloudinary
 */
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const publicId = parts.slice(uploadIndex + 1).join('/').split('.')[0];
    return publicId;
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
    CREATE FOOD (CLOUDINARY)
===================================================== */

exports.createFood = async (req, res) => {
    try {
        const {
            product_name,
            price,
            category,
            status
        } = req.body;

        const file = req.file;

        // VALIDATE
        if (!product_name || !product_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tên món ăn không được để trống'
            });
        }

        if (!price || Number(price) <= 0) {
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
            return res.status(409).json({
                success: false,
                message: 'Tên món ăn đã tồn tại'
            });
        }

        // Upload ảnh lên Cloudinary
        let food_image = null;
        if (file) {
            const result = await uploadToCloudinary(file, 'cinema_shop/foods');
            food_image = result.url;
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
            food_image,
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
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    UPDATE FOOD (CLOUDINARY)
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
            return res.status(404).json({
                success: false,
                message: 'Món ăn không tồn tại'
            });
        }

        // VALIDATE
        if (!product_name || !product_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tên món ăn không được để trống'
            });
        }

        if (!price || Number(price) <= 0) {
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
            return res.status(409).json({
                success: false,
                message: 'Tên món ăn đã tồn tại'
            });
        }

        // XỬ LÝ ẢNH VỚI CLOUDINARY
        let food_image = foodExists[0].food_image; // ảnh cũ

        if (file) {
            // Xóa ảnh cũ trên Cloudinary
            if (food_image) {
                const publicId = extractPublicId(food_image);
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(file, 'cinema_shop/foods');
            food_image = result.url;
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
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: err.message
        });
    }
};

/* =====================================================
    DELETE FOOD (CLOUDINARY)
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

        // Xóa ảnh trên Cloudinary
        if (foodExists[0].food_image) {
            const publicId = extractPublicId(foodExists[0].food_image);
            await deleteFromCloudinary(publicId);
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
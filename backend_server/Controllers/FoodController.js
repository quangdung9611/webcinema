const db = require('../Config/db');

const FoodController = {

    /* =====================================================
        GET ALL FOODS
    ===================================================== */

    getAllFoods: async (req, res) => {

        try {

            const query = `
                SELECT 
                    product_id,
                    product_name,
                    price,
                    food_image,
                    category,
                    description,
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

            console.error(
                '❌ Lỗi getAllFoods:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: err.message
            });

        }

    },

    /* =====================================================
        GET FOOD BY ID
    ===================================================== */

    getFoodById: async (req, res) => {

        try {

            const { id } = req.params;

            const query = `
                SELECT 
                    product_id,
                    product_name,
                    price,
                    food_image,
                    category,
                    description,
                    status,
                    created_at
                FROM product_menu
                WHERE product_id = ?
            `;

            const [foods] =
                await db.query(query, [id]);

            if (foods.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Không tìm thấy món ăn'
                });

            }

            return res.status(200).json({
                success: true,
                data: foods[0]
            });

        } catch (err) {

            console.error(
                '❌ Lỗi getFoodById:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: err.message
            });

        }

    },

    /* =====================================================
        CREATE FOOD
    ===================================================== */

    createFood: async (req, res) => {

        try {

            const {
                product_name,
                price,
                food_image,
                category,
                description,
                status
            } = req.body;

            /* =============================================
                VALIDATE
            ============================================= */

            if (
                !product_name ||
                !product_name.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Tên món ăn không được để trống'
                });

            }

            if (
                !price ||
                Number(price) <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Giá món ăn phải lớn hơn 0'
                });

            }

            /* =============================================
                CHECK DUPLICATE NAME
            ============================================= */

            const [duplicateFood] =
                await db.query(
                    `
                    SELECT product_id
                    FROM product_menu
                    WHERE LOWER(product_name)
                    = LOWER(?)
                    `,
                    [product_name.trim()]
                );

            if (
                duplicateFood.length > 0
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        'Tên món ăn đã tồn tại'
                });

            }

            /* =============================================
                INSERT
            ============================================= */

            const query = `
                INSERT INTO product_menu (
                    product_name,
                    price,
                    food_image,
                    category,
                    description,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const [result] =
                await db.query(query, [

                    product_name.trim(),

                    price,

                    food_image || null,

                    category || 'Other',

                    description || null,

                    status ?? 1
                ]);

            return res.status(201).json({
                success: true,
                message:
                    'Thêm món ăn thành công',
                product_id: result.insertId
            });

        } catch (err) {

            console.error(
                '❌ Lỗi createFood:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: err.message
            });

        }

    },

    /* =====================================================
        UPDATE FOOD
    ===================================================== */

    updateFood: async (req, res) => {

        try {

            const { id } = req.params;

            const {
                product_name,
                price,
                food_image,
                category,
                description,
                status
            } = req.body;

            /* =============================================
                CHECK EXIST
            ============================================= */

            const [foodExists] =
                await db.query(
                    `
                    SELECT *
                    FROM product_menu
                    WHERE product_id = ?
                    `,
                    [id]
                );

            if (
                foodExists.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Món ăn không tồn tại'
                });

            }

            /* =============================================
                VALIDATE
            ============================================= */

            if (
                !product_name ||
                !product_name.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Tên món ăn không được để trống'
                });

            }

            if (
                !price ||
                Number(price) <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Giá món ăn phải lớn hơn 0'
                });

            }

            /* =============================================
                CHECK DUPLICATE
            ============================================= */

            const [duplicateFood] =
                await db.query(
                    `
                    SELECT product_id
                    FROM product_menu
                    WHERE LOWER(product_name)
                    = LOWER(?)
                    AND product_id != ?
                    `,
                    [
                        product_name.trim(),
                        id
                    ]
                );

            if (
                duplicateFood.length > 0
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        'Tên món ăn đã tồn tại'
                });

            }

            /* =============================================
                UPDATE
            ============================================= */

            const query = `
                UPDATE product_menu
                SET
                    product_name = ?,
                    price = ?,
                    food_image = ?,
                    category = ?,
                    description = ?,
                    status = ?
                WHERE product_id = ?
            `;

            await db.query(query, [

                product_name.trim(),

                price,

                food_image || null,

                category || 'Other',

                description || null,

                status ?? 1,

                id
            ]);

            return res.status(200).json({
                success: true,
                message:
                    'Cập nhật món ăn thành công'
            });

        } catch (err) {

            console.error(
                '❌ Lỗi updateFood:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: err.message
            });

        }

    },

    /* =====================================================
        DELETE FOOD
    ===================================================== */

    deleteFood: async (req, res) => {

        try {

            const { id } = req.params;

            /* =============================================
                CHECK EXIST
            ============================================= */

            const [foodExists] =
                await db.query(
                    `
                    SELECT *
                    FROM product_menu
                    WHERE product_id = ?
                    `,
                    [id]
                );

            if (
                foodExists.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Món ăn không tồn tại'
                });

            }

            /* =============================================
                DELETE
            ============================================= */

            await db.query(
                `
                DELETE FROM product_menu
                WHERE product_id = ?
                `,
                [id]
            );

            return res.status(200).json({
                success: true,
                message:
                    'Xóa món ăn thành công'
            });

        } catch (err) {

            console.error(
                '❌ Lỗi deleteFood:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: err.message
            });

        }

    }

};

module.exports = FoodController;
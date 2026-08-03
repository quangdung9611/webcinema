
const db = require("../Config/db");

class FoodRepository {

    // ==========================================================
    // LẤY DANH SÁCH FOOD - PAGINATION
    //
    // Dùng cho ADMIN
    // Mặc định: 20 món / trang
    // Tối đa: 100 món / trang
    // ==========================================================

    async findAll(page = 1, limit = 20) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------

        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá nhiều dữ liệu
        if (limit > 100) {
            limit = 100;
        }


        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------

        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH FOOD
        // ======================================================

        const [rows] = await db.query(
            `
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

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ FOOD
        // ======================================================

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total

            FROM product_menu
            `
        );

        const total = Number(
            countRows[0]?.total || 0
        );


        // ======================================================
        // TÍNH TỔNG SỐ TRANG
        // ======================================================

        const totalPages = Math.ceil(
            total / limit
        );


        // ======================================================
        // RETURN
        // ======================================================

        return {
            data: rows,

            pagination: {
                page,
                limit,
                total,
                totalPages,

                hasPreviousPage:
                    page > 1,

                hasNextPage:
                    page < totalPages
            }
        };
    }


    // ==========================================================
    // LẤY FOOD THEO ID
    // Không pagination
    // ==========================================================

    async findById(productId) {

        const [rows] = await db.query(
            `
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

            LIMIT 1
            `,
            [productId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // KIỂM TRA TÊN FOOD
    // Không pagination
    // ==========================================================

    async findByName(
        name,
        excludeProductId = null
    ) {

        let sql = `
            SELECT product_id

            FROM product_menu

            WHERE LOWER(product_name) = LOWER(?)
        `;

        const params = [
            name.trim()
        ];


        // ------------------------------------------------------
        // UPDATE → loại trừ product hiện tại
        // ------------------------------------------------------

        if (excludeProductId != null) {

            sql += `
                AND product_id != ?
            `;

            params.push(
                Number(excludeProductId)
            );
        }


        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    // ==========================================================
    // CREATE FOOD
    // ==========================================================

    async create(data) {

        const {
            product_name,
            price,
            food_image,
            category,
            status
        } = data;


        const [result] = await db.query(
            `
            INSERT INTO product_menu
            (
                product_name,
                price,
                food_image,
                category,
                status
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                product_name.trim(),
                price,
                food_image || null,
                category || "Other",
                status ?? 1
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // UPDATE FOOD
    // ==========================================================

    async update(
        productId,
        data
    ) {

        const {
            product_name,
            price,
            food_image,
            category,
            status
        } = data;


        const [result] = await db.query(
            `
            UPDATE product_menu

            SET
                product_name = ?,
                price = ?,
                food_image = ?,
                category = ?,
                status = ?

            WHERE product_id = ?
            `,
            [
                product_name.trim(),
                price,
                food_image || null,
                category || "Other",
                status ?? 1,
                productId
            ]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // DELETE FOOD
    // ==========================================================

    async delete(productId) {

        const [result] = await db.query(
            `
            DELETE FROM product_menu

            WHERE product_id = ?
            `,
            [productId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // LẤY ẢNH FOOD
    // ==========================================================

    async getImage(productId) {

        const [rows] = await db.query(
            `
            SELECT food_image

            FROM product_menu

            WHERE product_id = ?

            LIMIT 1
            `,
            [productId]
        );

        return rows[0] || null;
    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = new FoodRepository();


const db = require("../Config/db");

class FoodRepository {
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE
                    product_name LIKE ?
                    OR category LIKE ?
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword);
        }

        const offset = (page - 1) * limit;

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
            ${whereClause}
            ORDER BY product_id DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM product_menu
            ${whereClause}
            `,
            queryParams
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

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

    async findByName(name, excludeProductId = null) {
        let sql = `
            SELECT product_id
            FROM product_menu
            WHERE LOWER(product_name) = LOWER(?)
        `;
        const params = [name.trim()];
        if (excludeProductId != null) {
            sql += ` AND product_id != ?`;
            params.push(Number(excludeProductId));
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    async create(data) {
        const { product_name, price, food_image, category, status } = data;
        const [result] = await db.query(
            `
            INSERT INTO product_menu
            (product_name, price, food_image, category, status)
            VALUES (?, ?, ?, ?, ?)
            `,
            [product_name.trim(), price, food_image || null, category || "Other", status ?? 1]
        );
        return result.insertId;
    }

    async update(productId, data) {
        const { product_name, price, food_image, category, status } = data;
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
            [product_name.trim(), price, food_image || null, category || "Other", status ?? 1, productId]
        );
        return result.affectedRows;
    }

    async delete(productId) {
        const [result] = await db.query(
            `DELETE FROM product_menu WHERE product_id = ?`,
            [productId]
        );
        return result.affectedRows;
    }

    async getImage(productId) {
        const [rows] = await db.query(
            `SELECT food_image FROM product_menu WHERE product_id = ? LIMIT 1`,
            [productId]
        );
        return rows[0] || null;
    }
}

module.exports = new FoodRepository();
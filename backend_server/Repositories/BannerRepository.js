
const db = require("../Config/db");

class BannerRepository {

    // ==========================================================
    // FIND ALL BANNERS - PAGINATION
    // Mặc định: 20 banner / trang
    // Tối đa: 100 banner / trang
    // Dùng cho Admin
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
        // LẤY DANH SÁCH BANNER
        // ======================================================

        const [rows] = await db.query(
            `
            SELECT
                banner_id,
                page,
                image_url,
                is_active,
                created_at,
                updated_at

            FROM banners

            ORDER BY created_at DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ BANNER
        // ======================================================

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM banners
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

                hasPreviousPage: page > 1,

                hasNextPage: page < totalPages
            }
        };
    }


    // ==========================================================
    // FIND BANNER BY ID
    // Không pagination
    // ==========================================================
    async findById(bannerId) {

        const [rows] = await db.query(
            `
            SELECT
                banner_id,
                page,
                image_url,
                is_active,
                created_at,
                updated_at

            FROM banners

            WHERE banner_id = ?

            LIMIT 1
            `,
            [bannerId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // FIND ALL ACTIVE BANNERS BY PAGE
    // Không pagination
    // Frontend cần toàn bộ banner active của từng page
    // ==========================================================
    async findActiveByPage(page) {

        const [rows] = await db.query(
            `
            SELECT
                banner_id,
                page,
                image_url,
                is_active,
                created_at,
                updated_at

            FROM banners

            WHERE page = ?
                AND is_active = 1

            ORDER BY created_at DESC
            `,
            [page]
        );

        return rows;
    }


    // ==========================================================
    // CREATE BANNER
    // ==========================================================
    async create(data) {

        const [result] = await db.query(
            `
            INSERT INTO banners
            (
                page,
                image_url,
                is_active
            )

            VALUES (?, ?, ?)
            `,
            [
                data.page,
                data.image_url,
                data.is_active !== undefined
                    ? data.is_active
                    : 1
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // UPDATE BANNER
    // ==========================================================
    async update(
        bannerId,
        data
    ) {

        const fields = [];
        const values = [];


        // ------------------------------------------------------
        // PAGE
        // ------------------------------------------------------

        if (data.page !== undefined) {

            fields.push(
                "page = ?"
            );

            values.push(
                data.page
            );
        }


        // ------------------------------------------------------
        // IMAGE
        // ------------------------------------------------------

        if (data.image_url !== undefined) {

            fields.push(
                "image_url = ?"
            );

            values.push(
                data.image_url
            );
        }


        // ------------------------------------------------------
        // STATUS
        // ------------------------------------------------------

        if (data.is_active !== undefined) {

            fields.push(
                "is_active = ?"
            );

            values.push(
                data.is_active
            );
        }


        // Không có dữ liệu để update
        if (fields.length === 0) {
            return 0;
        }


        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------

        values.push(
            bannerId
        );

        const query = `
            UPDATE banners

            SET
                ${fields.join(", ")},
                updated_at = NOW()

            WHERE banner_id = ?
        `;


        const [result] = await db.query(
            query,
            values
        );

        return result.affectedRows;
    }


    // ==========================================================
    // DELETE BANNER
    // ==========================================================
    async delete(bannerId) {

        const [result] = await db.query(
            `
            DELETE FROM banners

            WHERE banner_id = ?
            `,
            [bannerId]
        );

        return result.affectedRows;
    }
}


module.exports = new BannerRepository();



const db = require("../Config/db");

class BannerRepository {

    /* ==========================================================
        FIND ALL - KHÔNG PHÂN TRANG
        PUBLIC / ADMIN
        HỖ TRỢ SEARCH + PAGE KEY
    ========================================================== */
    async findAllAll(search = "", page = "") {

        search = typeof search === "string" ? search.trim() : "";
        page = typeof page === "string" ? page.trim() : "";

        const conditions = [];
        const params = [];

        /*
         * SEARCH
         * Tìm theo page hoặc image_url
         */
        if (search) {
            conditions.push(`
                (
                    page LIKE ?
                    OR image_url LIKE ?
                )
            `);

            const keyword = `%${search}%`;

            params.push(keyword, keyword);
        }

        /*
         * FILTER PAGE
         * Ví dụ:
         * HOME
         * PROMOTION
         * BLOG
         */
        if (page) {
            conditions.push(`page = ?`);
            params.push(page);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

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
            ${whereClause}
            ORDER BY created_at DESC, banner_id DESC
            `,
            params
        );

        return {
            data: rows,
            pagination: {
                page: 1,
                limit: rows.length,
                total: rows.length,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            }
        };
    }


    /* ==========================================================
        FIND ALL - CÓ PHÂN TRANG
        ADMIN
        HỖ TRỢ SEARCH
    ========================================================== */
    async findAll(
        onlyActive = false,
        page = 1,
        limit = 20,
        search = ""
    ) {

        /*
         * Chuẩn hóa page
         */
        page = Number.parseInt(page, 10);

        if (!Number.isFinite(page) || page < 1) {
            page = 1;
        }

        /*
         * Chuẩn hóa limit
         */
        limit = Number.parseInt(limit, 10);

        if (!Number.isFinite(limit) || limit < 1) {
            limit = 20;
        }

        /*
         * Giới hạn tối đa
         */
        if (limit > 100) {
            limit = 100;
        }

        /*
         * Chuẩn hóa search
         */
        search = typeof search === "string"
            ? search.trim()
            : "";

        /*
         * Xây dựng WHERE dùng chung
         * cho cả SELECT và COUNT
         */
        const conditions = [];
        const params = [];

        /*
         * SEARCH
         */
        if (search) {
            conditions.push(`
                (
                    page LIKE ?
                    OR image_url LIKE ?
                )
            `);

            const keyword = `%${search}%`;

            params.push(keyword, keyword);
        }

        /*
         * ONLY ACTIVE
         */
        if (onlyActive) {
            conditions.push(`is_active = 1`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        /*
         * OFFSET
         */
        const offset = (page - 1) * limit;

        /*
         * GET DATA
         */
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
            ${whereClause}
            ORDER BY created_at DESC, banner_id DESC
            LIMIT ? OFFSET ?
            `,
            [
                ...params,
                limit,
                offset
            ]
        );

        /*
         * GET TOTAL
         *
         * Dùng chính WHERE của SELECT
         * để tránh lỗi lệch điều kiện COUNT.
         */
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM banners
            ${whereClause}
            `,
            params
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


    /* ==========================================================
        FIND BANNER BY ID
    ========================================================== */
    async findById(bannerId) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM banners
            WHERE banner_id = ?
            LIMIT 1
            `,
            [bannerId]
        );

        return rows[0] || null;
    }


    /* ==========================================================
        CREATE BANNER
    ========================================================== */
    async create(data) {

        const {
            page,
            image_url,
            is_active
        } = data;

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
                page,
                image_url,
                is_active !== undefined
                    ? is_active
                    : 1
            ]
        );

        return result.insertId;
    }


    /* ==========================================================
        UPDATE BANNER
    ========================================================== */
    async update(bannerId, data) {

        const fields = [];
        const values = [];

        /*
         * PAGE
         */
        if (data.page !== undefined) {
            fields.push(`page = ?`);
            values.push(data.page);
        }

        /*
         * IMAGE
         */
        if (data.image_url !== undefined) {
            fields.push(`image_url = ?`);
            values.push(data.image_url);
        }

        /*
         * STATUS
         */
        if (data.is_active !== undefined) {
            fields.push(`is_active = ?`);
            values.push(data.is_active);
        }

        /*
         * Không có gì để update
         */
        if (fields.length === 0) {
            return 0;
        }

        values.push(bannerId);

        const [result] = await db.query(
            `
            UPDATE banners
            SET
                ${fields.join(", ")},
                updated_at = NOW()
            WHERE banner_id = ?
            `,
            values
        );

        return result.affectedRows;
    }


    /* ==========================================================
        DELETE BANNER
    ========================================================== */
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


    /* ==========================================================
        GET IMAGE
        DÙNG KHI CẦN XÓA ẢNH CLOUDINARY
    ========================================================== */
    async getImage(bannerId) {

        const [rows] = await db.query(
            `
            SELECT image_url
            FROM banners
            WHERE banner_id = ?
            LIMIT 1
            `,
            [bannerId]
        );

        return rows[0] || null;
    }


    /* ==========================================================
        GET ACTIVE BANNERS
        DÙNG CHO FRONTEND
    ========================================================== */
    async findActiveByPage(page) {

        page = typeof page === "string"
            ? page.trim()
            : "";

        if (!page) {
            return [];
        }

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
            ORDER BY created_at DESC, banner_id DESC
            `,
            [page]
        );

        return rows;
    }
}


module.exports = new BannerRepository();


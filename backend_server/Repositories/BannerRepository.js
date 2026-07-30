const db = require("../Config/db");

class BannerRepository {

    /*=========================================================
        FIND ALL BANNERS (admin)
    =========================================================*/
    async findAll() {
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
            `
        );
        return rows;
    }

    /*=========================================================
        FIND BANNER BY ID
    =========================================================*/
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

    /*=========================================================
        FIND ACTIVE BANNER BY PAGE (is_active = 1)
    =========================================================*/
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
            WHERE page = ? AND is_active = 1
            LIMIT 1
            `,
            [page]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CREATE BANNER
    =========================================================*/
    async create(data) {
        const [result] = await db.query(
            `
            INSERT INTO banners
            (page, image_url, is_active)
            VALUES (?, ?, ?)
            `,
            [
                data.page,
                data.image_url,
                data.is_active !== undefined ? data.is_active : 1
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        UPDATE BANNER
    =========================================================*/
    async update(bannerId, data) {
        const fields = [];
        const values = [];

        if (data.page !== undefined) {
            fields.push("page = ?");
            values.push(data.page);
        }
        if (data.image_url !== undefined) {
            fields.push("image_url = ?");
            values.push(data.image_url);
        }
        if (data.is_active !== undefined) {
            fields.push("is_active = ?");
            values.push(data.is_active);
        }

        if (fields.length === 0) {
            return 0;
        }

        values.push(bannerId);

        const query = `
            UPDATE banners
            SET ${fields.join(", ")}, updated_at = NOW()
            WHERE banner_id = ?
        `;

        const [result] = await db.query(query, values);
        return result.affectedRows;
    }

    /*=========================================================
        DEACTIVATE ALL BANNERS OF A PAGE
    =========================================================*/
    async deactivateAllByPage(page) {
        const [result] = await db.query(
            `
            UPDATE banners
            SET is_active = 0, updated_at = NOW()
            WHERE page = ?
            `,
            [page]
        );
        return result.affectedRows;
    }

    /*=========================================================
        DELETE BANNER
    =========================================================*/
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
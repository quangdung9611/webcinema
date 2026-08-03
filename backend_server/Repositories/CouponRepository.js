
const db = require("../Config/db");

class CouponRepository {

    // ==========================================================
    // LẤY DANH SÁCH COUPON - PAGINATION
    // Mặc định: 20 coupon / trang
    // Tối đa: 100 coupon / trang
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
        // LẤY DANH SÁCH COUPON
        // ======================================================
        const [rows] = await db.query(
            `
            SELECT
                coupon_id,
                coupon_code,
                discount_value,
                expiry_date,
                created_at,
                updated_at

            FROM coupons

            ORDER BY expiry_date DESC

            LIMIT ? OFFSET ?
            `,
            [
                limit,
                offset
            ]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ COUPON
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM coupons
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
    // LẤY COUPON THEO ID
    // Không pagination
    // ==========================================================
    async findById(couponId) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM coupons
            WHERE coupon_id = ?
            LIMIT 1
            `,
            [couponId]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY COUPON THEO CODE
    // Không pagination
    // ==========================================================
    async findByCode(code) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM coupons
            WHERE LOWER(coupon_code) = LOWER(?)
            LIMIT 1
            `,
            [code.trim()]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LẤY COUPON ĐANG HOẠT ĐỘNG THEO CODE
    // Không pagination
    // ==========================================================
    async findActiveByCode(code) {

        const [rows] = await db.query(
            `
            SELECT *
            FROM coupons

            WHERE LOWER(coupon_code) = LOWER(?)
                AND expiry_date >= CURDATE()

            LIMIT 1
            `,
            [code.trim()]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // KIỂM TRA CODE TRÙNG
    // Không pagination
    // ==========================================================
    async findByCodeExcludingId(
        code,
        excludeCouponId
    ) {

        const [rows] = await db.query(
            `
            SELECT coupon_id
            FROM coupons

            WHERE LOWER(coupon_code) = LOWER(?)
                AND coupon_id != ?
            `,
            [
                code.trim(),
                excludeCouponId
            ]
        );

        return rows[0] || null;
    }


    // ==========================================================
    // TẠO COUPON
    // ==========================================================
    async create(data) {

        const {
            coupon_code,
            discount_value,
            expiry_date
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO coupons
            (
                coupon_code,
                discount_value,
                expiry_date
            )
            VALUES (?, ?, ?)
            `,
            [
                coupon_code.trim().toUpperCase(),
                discount_value,
                expiry_date
            ]
        );

        return result.insertId;
    }


    // ==========================================================
    // CẬP NHẬT COUPON
    // ==========================================================
    async update(
        couponId,
        data
    ) {

        const {
            coupon_code,
            discount_value,
            expiry_date
        } = data;

        const [result] = await db.query(
            `
            UPDATE coupons

            SET
                coupon_code = ?,
                discount_value = ?,
                expiry_date = ?

            WHERE coupon_id = ?
            `,
            [
                coupon_code.trim().toUpperCase(),
                discount_value,
                expiry_date,
                couponId
            ]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // XÓA COUPON
    // ==========================================================
    async delete(couponId) {

        const [result] = await db.query(
            `
            DELETE FROM coupons
            WHERE coupon_id = ?
            `,
            [couponId]
        );

        return result.affectedRows;
    }


    // ==========================================================
    // ĐẾM SỐ LẦN USER ĐÃ SỬ DỤNG COUPON
    // Không pagination
    // ==========================================================
    async countUsedByUser(
        userId,
        couponId
    ) {

        const [rows] = await db.query(
            `
            SELECT COUNT(*) AS total

            FROM bookings

            WHERE user_id = ?
                AND coupon_id = ?
                AND status IN (
                    'Pending',
                    'Completed'
                )
            `,
            [
                userId,
                couponId
            ]
        );

        return rows[0].total;
    }
}

module.exports = new CouponRepository();


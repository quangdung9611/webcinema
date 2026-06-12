const db = require('../Config/db');

/* =========================================================
    HELPER: VALIDATE COUPON
========================================================= */

const validateCouponData = (data) => {
    const {
        coupon_code,
        discount_value,
        expiry_date
    } = data;

    if (!coupon_code || !discount_value || !expiry_date) {
        return {
            error: 'Vui lòng nhập đầy đủ thông tin mã giảm giá'
        };
    }

    if (coupon_code.trim().length < 3) {
        return {
            field: 'coupon_code',
            error: 'Mã giảm giá phải từ 3 ký tự trở lên'
        };
    }

    if (isNaN(discount_value) || Number(discount_value) <= 0) {
        return {
            field: 'discount_value',
            error: 'Giá trị giảm phải lớn hơn 0'
        };
    }

    return null;
};

/* =========================================================
    1. CHECK COUPON (USER)
========================================================= */

exports.checkCoupon = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin mã hoặc người dùng!'
            });
        }

        const [couponRows] = await db.query(
            `
            SELECT *
            FROM coupons
            WHERE LOWER(coupon_code) = LOWER(?)
            AND expiry_date >= CURDATE()
            `,
            [code.trim()]
        );

        if (!couponRows.length) {
            return res.status(404).json({
                success: false,
                message: 'Mã giảm giá không tồn tại hoặc đã hết hạn!'
            });
        }

        const coupon = couponRows[0];

        const [usedRows] = await db.query(
            `
            SELECT status
            FROM bookings
            WHERE user_id = ?
            AND coupon_id = ?
            AND status IN ('Pending', 'Completed')
            `,
            [userId, coupon.coupon_id]
        );

        if (usedRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã sử dụng mã này hoặc đang có đơn chờ!'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                coupon_id: coupon.coupon_id,
                discount_value: coupon.discount_value
            }
        });

    } catch (error) {
        console.error('❌ checkCoupon error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi kiểm tra mã.'
        });
    }
};

/* =========================================================
    2. GET ALL COUPONS (ADMIN)
========================================================= */

exports.getAllCoupons = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM coupons
            ORDER BY expiry_date DESC
        `);

        return res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================================================
    3. CREATE COUPON (ADMIN)
========================================================= */

exports.createCoupon = async (req, res) => {
    try {
        const {
            coupon_code,
            discount_value,
            expiry_date
        } = req.body;

        const validationError = validateCouponData(req.body);

        if (validationError) {
            return res.status(400).json(validationError);
        }

        const [existingCoupon] = await db.query(
            `
            SELECT coupon_id
            FROM coupons
            WHERE LOWER(coupon_code) = LOWER(?)
            `,
            [coupon_code.trim()]
        );

        if (existingCoupon.length > 0) {
            return res.status(400).json({
                field: 'coupon_code',
                error: 'Mã giảm giá đã tồn tại'
            });
        }

        await db.query(
            `
            INSERT INTO coupons
            (coupon_code, discount_value, expiry_date)
            VALUES (?, ?, ?)
            `,
            [
                coupon_code.trim().toUpperCase(),
                discount_value,
                expiry_date
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Thêm mã giảm giá thành công!'
        });

    } catch (error) {
        console.error('❌ createCoupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================================================
    4. UPDATE COUPON (ADMIN)
========================================================= */

exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            coupon_code,
            discount_value,
            expiry_date
        } = req.body;

        const validationError = validateCouponData(req.body);

        if (validationError) {
            return res.status(400).json(validationError);
        }

        const [couponRows] = await db.query(
            `
            SELECT coupon_id
            FROM coupons
            WHERE coupon_id = ?
            `,
            [id]
        );

        if (!couponRows.length) {
            return res.status(404).json({
                error: 'Không tìm thấy mã giảm giá'
            });
        }

        const [duplicateRows] = await db.query(
            `
            SELECT coupon_id
            FROM coupons
            WHERE LOWER(coupon_code) = LOWER(?)
            AND coupon_id != ?
            `,
            [coupon_code.trim(), id]
        );

        if (duplicateRows.length > 0) {
            return res.status(400).json({
                field: 'coupon_code',
                error: 'Mã giảm giá đã tồn tại'
            });
        }

        await db.query(
            `
            UPDATE coupons
            SET coupon_code = ?, discount_value = ?, expiry_date = ?
            WHERE coupon_id = ?
            `,
            [
                coupon_code.trim().toUpperCase(),
                discount_value,
                expiry_date,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật mã giảm giá thành công!'
        });

    } catch (error) {
        console.error('❌ updateCoupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================================================
    5. DELETE COUPON (ADMIN)
========================================================= */

exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const [couponRows] = await db.query(
            `
            SELECT coupon_id
            FROM coupons
            WHERE coupon_id = ?
            `,
            [id]
        );

        if (!couponRows.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã giảm giá'
            });
        }

        await db.query(
            `
            DELETE FROM coupons
            WHERE coupon_id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Xóa mã giảm giá thành công!'
        });

    } catch (error) {
        console.error('❌ deleteCoupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
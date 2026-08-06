const CouponService = require("../Services/CouponService");

/*=========================================================
    PUBLIC - CHECK COUPON
=========================================================*/
exports.checkCoupon = async (req, res) => {
    try {
        const { code, userId } = req.body;
        const result = await CouponService.checkCoupon(code, userId);
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error("checkCoupon error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi hệ thống"
        });
    }
};

/*=========================================================
    PUBLIC/ADMIN - GET ALL COUPONS (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllCouponsAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        // Không cho phép page / limit trên API không phân trang
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/coupons không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/coupons/paginated để phân trang."
            });
        }

        // Service trả về thẳng rows[]
        const data = await CouponService.getAllCouponsAll(search);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("getAllCouponsAll error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi hệ thống"
        });
    }
};

/*=========================================================
    ADMIN - GET COUPONS WITH PAGINATION
=========================================================*/
exports.getCouponsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const result = await CouponService.getAllCouponsPaginated(page, limit, search);

        // Service trả về { data: [], pagination: {} }
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("getCouponsWithPagination error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi hệ thống"
        });
    }
};

/*=========================================================
    ADMIN - CREATE COUPON
=========================================================*/
exports.createCoupon = async (req, res) => {
    try {
        const couponId = await CouponService.createCoupon(req.body);
        return res.status(201).json({
            success: true,
            message: "Thêm mã giảm giá thành công!",
            data: { coupon_id: couponId }
        });
    } catch (err) {
        console.error("createCoupon error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi hệ thống"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE COUPON
=========================================================*/
exports.updateCoupon = async (req, res) => {
    try {
        const { coupon_id } = req.params;
        await CouponService.updateCoupon(coupon_id, req.body);
        return res.status(200).json({
            success: true,
            message: "Cập nhật mã giảm giá thành công!"
        });
    } catch (err) {
        console.error("updateCoupon error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi hệ thống"
        });
    }
};

/*=========================================================
    ADMIN - DELETE COUPON
=========================================================*/
exports.deleteCoupon = async (req, res) => {
    try {
        const { coupon_id } = req.params;
        await CouponService.deleteCoupon(coupon_id);
        return res.status(200).json({
            success: true,
            message: "Xóa mã giảm giá thành công!"
        });
    } catch (err) {
        console.error("deleteCoupon error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi hệ thống"
        });
    }
};
const CouponService = require("../Services/CouponService");

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

exports.getAllCoupons = async (req, res) => {
  try {
    const data = await CouponService.getAllCoupons();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("getAllCoupons error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi hệ thống"
    });
  }
};

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

exports.updateCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.params; // ✅ sửa
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

exports.deleteCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.params; // ✅ sửa
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
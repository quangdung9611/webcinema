const CouponRepository = require("../Repositories/CouponRepository");

const validateCouponData = (data) => {
  const { coupon_code, discount_value, expiry_date } = data;

  if (!coupon_code || !discount_value || !expiry_date) {
    return { field: null, error: "Vui lòng nhập đầy đủ thông tin mã giảm giá" };
  }

  if (coupon_code.trim().length < 3) {
    return { field: "coupon_code", error: "Mã giảm giá phải từ 3 ký tự trở lên" };
  }

  if (isNaN(discount_value) || Number(discount_value) <= 0) {
    return { field: "discount_value", error: "Giá trị giảm phải lớn hơn 0" };
  }

  return null;
};

class CouponService {
  async getAllCoupons() {
    return await CouponRepository.findAll();
  }

  async getCouponById(id) {
    const coupon = await CouponRepository.findById(id);
    if (!coupon) {
      const err = new Error("Không tìm thấy mã giảm giá");
      err.statusCode = 404;
      throw err;
    }
    return coupon;
  }

  async checkCoupon(code, userId) {
    if (!code || !userId) {
      const err = new Error("Thiếu thông tin mã hoặc người dùng");
      err.statusCode = 400;
      throw err;
    }

    const coupon = await CouponRepository.findActiveByCode(code);
    if (!coupon) {
      const err = new Error("Mã giảm giá không tồn tại hoặc đã hết hạn");
      err.statusCode = 404;
      throw err;
    }

    const usedCount = await CouponRepository.countUsedByUser(userId, coupon.coupon_id);
    if (usedCount > 0) {
      const err = new Error("Bạn đã sử dụng mã này hoặc đang có đơn chờ");
      err.statusCode = 400;
      throw err;
    }

    return {
      coupon_id: coupon.coupon_id,
      discount_value: coupon.discount_value
    };
  }

  async createCoupon(data) {
    const error = validateCouponData(data);
    if (error) {
      const err = new Error(error.error);
      err.field = error.field;
      err.statusCode = 400;
      throw err;
    }

    const existing = await CouponRepository.findByCode(data.coupon_code);
    if (existing) {
      const err = new Error("Mã giảm giá đã tồn tại");
      err.field = "coupon_code";
      err.statusCode = 400;
      throw err;
    }

    return await CouponRepository.create(data);
  }

  async updateCoupon(id, data) {
    const existing = await CouponRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy mã giảm giá");
      err.statusCode = 404;
      throw err;
    }

    const error = validateCouponData(data);
    if (error) {
      const err = new Error(error.error);
      err.field = error.field;
      err.statusCode = 400;
      throw err;
    }

    const duplicate = await CouponRepository.findByCodeExcludingId(data.coupon_code, id);
    if (duplicate) {
      const err = new Error("Mã giảm giá đã tồn tại");
      err.field = "coupon_code";
      err.statusCode = 400;
      throw err;
    }

    const affected = await CouponRepository.update(id, data);
    if (affected === 0) {
      const err = new Error("Không thể cập nhật mã giảm giá");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }

  async deleteCoupon(id) {
    const existing = await CouponRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy mã giảm giá");
      err.statusCode = 404;
      throw err;
    }

    const affected = await CouponRepository.delete(id);
    if (affected === 0) {
      const err = new Error("Không thể xóa mã giảm giá");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }
}

module.exports = new CouponService();
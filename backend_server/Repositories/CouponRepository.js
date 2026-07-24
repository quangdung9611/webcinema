const db = require("../Config/db");

class CouponRepository {
  async findAll() {
    const [rows] = await db.query(`
      SELECT coupon_id, coupon_code, discount_value, expiry_date, created_at, updated_at
      FROM coupons
      ORDER BY expiry_date DESC
    `);
    return rows;
  }

  async findById(couponId) { // ✅ sửa
    const [rows] = await db.query(
      `SELECT * FROM coupons WHERE coupon_id = ? LIMIT 1`,
      [couponId]
    );
    return rows[0] || null;
  }

  async findByCode(code) {
    const [rows] = await db.query(
      `SELECT * FROM coupons WHERE LOWER(coupon_code) = LOWER(?) LIMIT 1`,
      [code.trim()]
    );
    return rows[0] || null;
  }

  async findActiveByCode(code) {
    const [rows] = await db.query(
      `SELECT * FROM coupons 
       WHERE LOWER(coupon_code) = LOWER(?) 
       AND expiry_date >= CURDATE()
       LIMIT 1`,
      [code.trim()]
    );
    return rows[0] || null;
  }

  async findByCodeExcludingId(code, excludeCouponId) { // ✅ sửa
    const [rows] = await db.query(
      `SELECT coupon_id FROM coupons 
       WHERE LOWER(coupon_code) = LOWER(?) AND coupon_id != ?`,
      [code.trim(), excludeCouponId]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { coupon_code, discount_value, expiry_date } = data;
    const [result] = await db.query(
      `INSERT INTO coupons (coupon_code, discount_value, expiry_date)
       VALUES (?, ?, ?)`,
      [coupon_code.trim().toUpperCase(), discount_value, expiry_date]
    );
    return result.insertId;
  }

  async update(couponId, data) { // ✅ sửa
    const { coupon_code, discount_value, expiry_date } = data;
    const [result] = await db.query(
      `UPDATE coupons 
       SET coupon_code = ?, discount_value = ?, expiry_date = ?
       WHERE coupon_id = ?`,
      [coupon_code.trim().toUpperCase(), discount_value, expiry_date, couponId]
    );
    return result.affectedRows;
  }

  async delete(couponId) { // ✅ sửa
    const [result] = await db.query(
      `DELETE FROM coupons WHERE coupon_id = ?`,
      [couponId]
    );
    return result.affectedRows;
  }

  async countUsedByUser(userId, couponId) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE user_id = ? AND coupon_id = ?
       AND status IN ('Pending', 'Completed')`,
      [userId, couponId]
    );
    return rows[0].total;
  }
}

module.exports = new CouponRepository();
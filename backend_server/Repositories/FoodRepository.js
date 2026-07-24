const db = require("../Config/db");

class FoodRepository {
  async findAll() {
    const [rows] = await db.query(
      `SELECT product_id, product_name, price, food_image, category, status, created_at
       FROM product_menu
       ORDER BY product_id DESC`
    );
    return rows;
  }

  async findById(productId) { // ✅ sửa
    const [rows] = await db.query(
      `SELECT product_id, product_name, price, food_image, category, status, created_at
       FROM product_menu
       WHERE product_id = ? LIMIT 1`,
      [productId]
    );
    return rows[0] || null;
  }

  async findByName(name, excludeProductId = null) { // ✅ sửa
    let sql = `SELECT product_id FROM product_menu WHERE LOWER(product_name) = LOWER(?)`;
    const params = [name.trim()];
    if (excludeProductId) {
      sql += ` AND product_id != ?`;
      params.push(excludeProductId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async create(data) {
    const { product_name, price, food_image, category, status } = data;
    const [result] = await db.query(
      `INSERT INTO product_menu (product_name, price, food_image, category, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        product_name.trim(),
        price,
        food_image || null,
        category || "Other",
        status ?? 1,
      ]
    );
    return result.insertId;
  }

  async update(productId, data) { // ✅ sửa
    const { product_name, price, food_image, category, status } = data;
    const [result] = await db.query(
      `UPDATE product_menu
       SET product_name = ?, price = ?, food_image = ?, category = ?, status = ?
       WHERE product_id = ?`,
      [
        product_name.trim(),
        price,
        food_image || null,
        category || "Other",
        status ?? 1,
        productId,
      ]
    );
    return result.affectedRows;
  }

  async delete(productId) { // ✅ sửa
    const [result] = await db.query(
      `DELETE FROM product_menu WHERE product_id = ?`,
      [productId]
    );
    return result.affectedRows;
  }

  async getImage(productId) { // ✅ sửa
    const [rows] = await db.query(
      `SELECT food_image FROM product_menu WHERE product_id = ?`,
      [productId]
    );
    return rows[0] || null;
  }
}

module.exports = new FoodRepository();
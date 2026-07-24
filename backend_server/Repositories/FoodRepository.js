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

  async findById(id) {
    const [rows] = await db.query(
      `SELECT product_id, product_name, price, food_image, category, status, created_at
       FROM product_menu
       WHERE product_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByName(name, excludeId = null) {
    let sql = `SELECT product_id FROM product_menu WHERE LOWER(product_name) = LOWER(?)`;
    const params = [name.trim()];
    if (excludeId) {
      sql += ` AND product_id != ?`;
      params.push(excludeId);
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

  async update(id, data) {
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
        id,
      ]
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await db.query(
      `DELETE FROM product_menu WHERE product_id = ?`,
      [id]
    );
    return result.affectedRows;
  }

  async getImage(id) {
    const [rows] = await db.query(
      `SELECT food_image FROM product_menu WHERE product_id = ?`,
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = new FoodRepository();
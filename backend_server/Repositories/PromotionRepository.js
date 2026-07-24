const db = require("../Config/db");

class PromotionRepository {
  async findAll(onlyActive = false) {
    let sql = `
      SELECT promotion_id, title, slug, description, promotion_image,
             views, likes, is_active, created_at, updated_at
      FROM promotions
    `;
    if (onlyActive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(sql);
    return rows;
  }

  async findById(promotionId) {
    const [rows] = await db.query(
      `SELECT * FROM promotions WHERE promotion_id = ? LIMIT 1`,
      [promotionId]
    );
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await db.query(
      `SELECT * FROM promotions WHERE slug = ? LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  async findByTitleOrSlug(title, slug, excludePromotionId = null) {
    let sql = `SELECT promotion_id FROM promotions WHERE (title = ? OR slug = ?)`;
    const params = [title.trim(), slug];
    if (excludePromotionId) {
      sql += ` AND promotion_id != ?`;
      params.push(excludePromotionId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async create(data) {
    const {
      title, slug, description, promotion_image,
      likes, is_active = 1
    } = data;
    const [result] = await db.query(
      `INSERT INTO promotions (title, slug, description, promotion_image, likes, views, is_active)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        title.trim(),
        slug,
        description || "",
        promotion_image || null,
        parseInt(likes, 10) || 0,
        is_active
      ]
    );
    return result.insertId;
  }

  async update(promotionId, data) {
    const {
      title, slug, description, promotion_image,
      likes, is_active
    } = data;
    const [result] = await db.query(
      `UPDATE promotions
       SET title = ?, slug = ?, description = ?,
           promotion_image = ?, likes = ?, is_active = ?
       WHERE promotion_id = ?`,
      [
        title.trim(),
        slug,
        description || "",
        promotion_image || null,
        parseInt(likes, 10) || 0,
        is_active,
        promotionId
      ]
    );
    return result.affectedRows;
  }

  async delete(promotionId) {
    const [result] = await db.query(
      `DELETE FROM promotions WHERE promotion_id = ?`,
      [promotionId]
    );
    return result.affectedRows;
  }

  async getImage(promotionId) {
    const [rows] = await db.query(
      `SELECT promotion_image FROM promotions WHERE promotion_id = ?`,
      [promotionId]
    );
    return rows[0] || null;
  }

  async incrementLikes(promotionId) {
    const [result] = await db.query(
      `UPDATE promotions SET likes = likes + 1 WHERE promotion_id = ?`,
      [promotionId]
    );
    return result.affectedRows;
  }

  async incrementViews(promotionId) {
    const [result] = await db.query(
      `UPDATE promotions SET views = views + 1 WHERE promotion_id = ?`,
      [promotionId]
    );
    return result.affectedRows;
  }

  async toggleStatus(promotionId) {
    const [rows] = await db.query(
      `SELECT is_active FROM promotions WHERE promotion_id = ?`,
      [promotionId]
    );
    if (rows.length === 0) return null;
    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query(
      `UPDATE promotions SET is_active = ? WHERE promotion_id = ?`,
      [newStatus, promotionId]
    );
    return newStatus;
  }

  async getConnection() {
    return db.getConnection();
  }

  async beginTransaction(conn) {
    await conn.beginTransaction();
  }

  async commit(conn) {
    await conn.commit();
  }

  async rollback(conn) {
    await conn.rollback();
  }
}

module.exports = new PromotionRepository();
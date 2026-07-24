const db = require("../Config/db");

class NewsRepository {
  async findAll(onlyActive = false) {
    let sql = `
      SELECT
        news_id,
        title,
        slug,
        news_image,
        views,
        likes,
        DATE_FORMAT(created_at, '%d/%m/%Y') AS date,
        IF(LENGTH(content) > 150,
          CONCAT(LEFT(content, 150), '...'),
          content
        ) AS short_content
      FROM news
    `;
    const params = [];
    if (onlyActive) {
      sql += ` WHERE 1=1`; // Nếu có cột is_active thì thêm vào
    }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  async findAllAdmin() {
    const [rows] = await db.query(
      `SELECT *, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
       FROM news
       ORDER BY created_at DESC`
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM news WHERE news_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await db.query(
      `SELECT * FROM news WHERE slug = ? LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  async findByTitleOrSlug(title, slug, excludeId = null) {
    let sql = `SELECT news_id FROM news WHERE (title = ? OR slug = ?)`;
    const params = [title.trim(), slug];
    if (excludeId) {
      sql += ` AND news_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async create(data) {
    const { title, slug, content, news_image, likes } = data;
    const [result] = await db.query(
      `INSERT INTO news (title, slug, content, news_image, likes, views)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [title.trim(), slug, content.trim(), news_image || null, parseInt(likes, 10) || 0]
    );
    return result.insertId;
  }

  async update(id, data) {
    const { title, slug, content, news_image, likes } = data;
    const [result] = await db.query(
      `UPDATE news
       SET title = ?, slug = ?, content = ?, news_image = ?, likes = ?
       WHERE news_id = ?`,
      [title.trim(), slug, content.trim(), news_image || null, parseInt(likes, 10) || 0, id]
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await db.query(
      `DELETE FROM news WHERE news_id = ?`,
      [id]
    );
    return result.affectedRows;
  }

  async getImage(id) {
    const [rows] = await db.query(
      `SELECT news_image FROM news WHERE news_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async incrementLikes(id) {
    const [result] = await db.query(
      `UPDATE news SET likes = likes + 1 WHERE news_id = ?`,
      [id]
    );
    return result.affectedRows;
  }

  async incrementViews(id) {
    const [result] = await db.query(
      `UPDATE news SET views = views + 1 WHERE news_id = ?`,
      [id]
    );
    return result.affectedRows;
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

module.exports = new NewsRepository();
const db = require("../Config/db");

class BlogCinemaRepository {
  async findAll(onlyActive = false) {
    let sql = `SELECT blog_id, title, slug, description, blog_image, views, likes, is_active, created_at, updated_at
               FROM blog_cinema`;
    const params = [];
    if (onlyActive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(`SELECT * FROM blog_cinema WHERE blog_id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await db.query(
      `SELECT * FROM blog_cinema WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  async findByTitleOrSlug(title, slug, excludeId = null) {
    let sql = `SELECT blog_id FROM blog_cinema WHERE title = ? OR slug = ?`;
    const params = [title.trim(), slug];
    if (excludeId) {
      sql += ` AND blog_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async incrementViews(id) {
    await db.query(`UPDATE blog_cinema SET views = views + 1 WHERE blog_id = ?`, [id]);
  }

  async incrementLikes(id) {
    await db.query(`UPDATE blog_cinema SET likes = likes + 1 WHERE blog_id = ?`, [id]);
  }

  async create(data) {
    const { title, slug, description, blog_image, likes, is_active } = data;
    const [result] = await db.query(
      `INSERT INTO blog_cinema (title, slug, description, blog_image, likes, views, is_active)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [title.trim(), slug, description.trim(), blog_image || null, parseInt(likes,10)||0, is_active||1]
    );
    return result.insertId;
  }

  async update(id, data) {
    const { title, slug, description, blog_image, likes, is_active } = data;
    const [result] = await db.query(
      `UPDATE blog_cinema SET title=?, slug=?, description=?, blog_image=?, likes=?, is_active=?
       WHERE blog_id=?`,
      [title.trim(), slug, description.trim(), blog_image || null, parseInt(likes,10)||0, is_active||0, id]
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await db.query(`DELETE FROM blog_cinema WHERE blog_id=?`, [id]);
    return result.affectedRows;
  }

  async getImage(id) {
    const [rows] = await db.query(`SELECT blog_image FROM blog_cinema WHERE blog_id=?`, [id]);
    return rows[0] || null;
  }

  async getConnection() {
    return db.getConnection();
  }
  async beginTransaction(connection) {
    await connection.beginTransaction();
  }
  async commit(connection) {
    await connection.commit();
  }
  async rollback(connection) {
    await connection.rollback();
  }
}

module.exports = new BlogCinemaRepository();
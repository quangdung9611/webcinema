const db = require("../Config/db");

class GenreRepository {
  async findAll() {
    const [rows] = await db.query(
      `SELECT * FROM genres ORDER BY genre_id DESC`
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM genres WHERE genre_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByName(name, excludeId = null) {
    let sql = `SELECT genre_id FROM genres WHERE genre_name = ?`;
    const params = [name.trim()];
    if (excludeId) {
      sql += ` AND genre_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async findByNameWithSlug(name, slug, excludeId = null) {
    let sql = `SELECT genre_id FROM genres WHERE genre_name = ? OR slug = ?`;
    const params = [name.trim(), slug];
    if (excludeId) {
      sql += ` AND genre_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async checkLinked(id) {
    const [rows] = await db.query(
      `SELECT movie_id FROM movie_genres WHERE genre_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { genre_name, slug } = data;
    const [result] = await db.query(
      `INSERT INTO genres (genre_name, slug) VALUES (?, ?)`,
      [genre_name.trim(), slug]
    );
    return result.insertId;
  }

  async update(id, data) {
    const { genre_name, slug } = data;
    const [result] = await db.query(
      `UPDATE genres SET genre_name = ?, slug = ? WHERE genre_id = ?`,
      [genre_name.trim(), slug, id]
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await db.query(
      `DELETE FROM genres WHERE genre_id = ?`,
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = new GenreRepository();
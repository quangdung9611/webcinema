const db = require("../Config/db");

class CinemaRepository {
  async findAll() {
    const [rows] = await db.query(`
      SELECT cinema_id, cinema_name, slug, address, city, hotline, map_link,
             DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS formatted_date
      FROM cinemas
      ORDER BY cinema_id DESC
    `);
    return rows;
  }

  async findById(cinemaId) {
    const [rows] = await db.query(
      `SELECT * FROM cinemas WHERE cinema_id = ? LIMIT 1`,
      [cinemaId]
    );
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await db.query(
      `SELECT * FROM cinemas WHERE slug = ? LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  async findByName(name, excludeCinemaId = null) {
    let sql = `SELECT cinema_id FROM cinemas WHERE cinema_name = ?`;
    const params = [name.trim()];
    if (excludeCinemaId) {
      sql += ` AND cinema_id != ?`;
      params.push(excludeCinemaId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async findByHotline(hotline, excludeCinemaId = null) {
    let sql = `SELECT cinema_id FROM cinemas WHERE hotline = ?`;
    const params = [hotline];
    if (excludeCinemaId) {
      sql += ` AND cinema_id != ?`;
      params.push(excludeCinemaId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async create(data) {
    const { cinema_name, slug, address, city, hotline, map_link } = data;
    const [result] = await db.query(
      `INSERT INTO cinemas (cinema_name, slug, address, city, hotline, map_link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cinema_name.trim(),
        slug,
        address.trim(),
        city.trim(),
        hotline.trim(),
        map_link.trim()
      ]
    );
    return result.insertId;
  }

  async update(cinemaId, data) {
    const { cinema_name, slug, address, city, hotline, map_link } = data;
    const [result] = await db.query(
      `UPDATE cinemas
       SET cinema_name = ?, slug = ?, address = ?, city = ?, hotline = ?, map_link = ?
       WHERE cinema_id = ?`,
      [
        cinema_name.trim(),
        slug,
        address.trim(),
        city.trim(),
        hotline.trim(),
        map_link.trim(),
        cinemaId
      ]
    );
    return result.affectedRows;
  }

  async delete(cinemaId) {
    const [result] = await db.query(
      `DELETE FROM cinemas WHERE cinema_id = ?`,
      [cinemaId]
    );
    return result.affectedRows;
  }

  async getMoviesByCinema(cinemaId) {
    const [rows] = await db.execute(`
      SELECT
        m.movie_id,
        m.title,
        m.movie_poster,
        s.showtime_id,
        s.start_time
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.movie_id
      WHERE s.cinema_id = ?
      ORDER BY s.start_time ASC
    `, [cinemaId]);
    return rows;
  }
}

module.exports = new CinemaRepository();
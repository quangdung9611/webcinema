const db = require("../Config/db");

class ReviewRepository {
  async create(data) {
    const { movie_id, user_id, rating_score, comment } = data;
    const [result] = await db.query(
      `INSERT INTO reviews (movie_id, user_id, rating_score, comment)
       VALUES (?, ?, ?, ?)`,
      [movie_id, user_id, rating_score, comment || null]
    );
    return result.insertId;
  }

  async findByMovie(movieId) {
    const sql = `
      SELECT
        r.review_id,
        r.movie_id,
        r.user_id,
        r.rating_score,
        r.comment,
        DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
        u.username,
        u.full_name,
        IFNULL(u.full_name, u.username) AS display_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.movie_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(sql, [movieId]);
    return rows;
  }

  async findByUserAndMovie(userId, movieId) {
    const [rows] = await db.query(
      `SELECT review_id FROM reviews WHERE user_id = ? AND movie_id = ? LIMIT 1`,
      [userId, movieId]
    );
    return rows[0] || null;
  }

  async getAverageRating(movieId) {
    const [rows] = await db.query(
      `SELECT IFNULL(ROUND(AVG(rating_score), 1), 0) AS avg_rating,
              COUNT(*) AS total_reviews
       FROM reviews WHERE movie_id = ?`,
      [movieId]
    );
    return rows[0];
  }
}

module.exports = new ReviewRepository();
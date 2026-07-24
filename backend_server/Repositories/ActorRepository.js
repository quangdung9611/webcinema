const db = require("../Config/db");

class ActorRepository {
  // ==========================================================
  // LẤY DANH SÁCH TẤT CẢ DIỄN VIÊN
  // ==========================================================
  async findAll() {
    const [rows] = await db.query(
      `
      SELECT
        actor_id,
        name,
        gender,
        nationality,
        actor_avatar,
        biography,
        birthday,
        slug,
        created_at,
        updated_at
      FROM actors
      ORDER BY actor_id DESC
      `
    );
    return rows;
  }

  // ==========================================================
  // TÌM DIỄN VIÊN THEO ACTOR_ID
  // ==========================================================
  async findById(actorId) { // ✅ đổi tên tham số
    const [rows] = await db.query(
      `
      SELECT
        actor_id,
        name,
        gender,
        nationality,
        actor_avatar,
        biography,
        birthday,
        slug,
        created_at,
        updated_at
      FROM actors
      WHERE actor_id = ?
      LIMIT 1
      `,
      [actorId]
    );
    return rows[0] || null;
  }

  // ==========================================================
  // TÌM DIỄN VIÊN THEO SLUG (kèm danh sách phim)
  // ==========================================================
  async findBySlugWithMovies(slug) {
    const [actorRows] = await db.query(
      `
      SELECT
        actor_id,
        name,
        gender,
        nationality,
        actor_avatar,
        biography,
        birthday,
        slug,
        created_at,
        updated_at
      FROM actors
      WHERE slug = ?
      LIMIT 1
      `,
      [slug]
    );
    const actor = actorRows[0];
    if (!actor) return null;

    const [movies] = await db.query(
      `
      SELECT
        m.movie_id,
        m.title,
        m.slug,
        m.movie_poster,
        m.release_date
      FROM movies m
      JOIN movie_actors ma ON m.movie_id = ma.movie_id
      WHERE ma.actor_id = ?
      ORDER BY m.release_date DESC
      `,
      [actor.actor_id]
    );
    actor.movies = movies;
    return actor;
  }

  // ==========================================================
  // TÌM THEO TÊN HOẶC SLUG (dùng để kiểm tra trùng)
  // ==========================================================
  async findByNameOrSlug(name, slug, excludeId = null) {
    let sql = `SELECT actor_id FROM actors WHERE name = ? OR slug = ?`;
    const params = [name.trim(), slug];
    if (excludeId) {
      sql += ` AND actor_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  // ==========================================================
  // LẤY ẢNH CỦA DIỄN VIÊN (để xóa trên Cloudinary)
  // ==========================================================
  async getAvatar(actorId) { // ✅ đổi tên tham số
    const [rows] = await db.query(
      `SELECT actor_avatar FROM actors WHERE actor_id = ?`,
      [actorId]
    );
    return rows[0] || null;
  }

  // ==========================================================
  // CRUD CHÍNH
  // ==========================================================
  async create(data) {
    const {
      name,
      slug,
      gender,
      nationality,
      actor_avatar,
      biography,
      birthday,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO actors (
        name, slug, gender, nationality,
        actor_avatar, biography, birthday
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        slug,
        gender,
        nationality.trim(),
        actor_avatar || null,
        biography.trim(),
        birthday,
      ]
    );
    return result.insertId;
  }

  async update(actorId, data) { // ✅ đổi tên tham số
    const {
      name,
      slug,
      gender,
      nationality,
      actor_avatar,
      biography,
      birthday,
    } = data;

    const [result] = await db.query(
      `
      UPDATE actors
      SET
        name = ?,
        slug = ?,
        gender = ?,
        nationality = ?,
        actor_avatar = ?,
        biography = ?,
        birthday = ?
      WHERE actor_id = ?
      `,
      [
        name.trim(),
        slug,
        gender,
        nationality.trim(),
        actor_avatar || null,
        biography.trim(),
        birthday,
        actorId,
      ]
    );
    return result.affectedRows;
  }

  async delete(actorId) { // ✅ đổi tên tham số
    const [result] = await db.query(
      `DELETE FROM actors WHERE actor_id = ?`,
      [actorId]
    );
    return result.affectedRows;
  }

  // ==========================================================
  // TRANSACTION SUPPORT
  // ==========================================================
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

  // Dùng với connection có sẵn
  async createWithConnection(connection, data) {
    const {
      name,
      slug,
      gender,
      nationality,
      actor_avatar,
      biography,
      birthday,
    } = data;

    const [result] = await connection.query(
      `
      INSERT INTO actors (
        name, slug, gender, nationality,
        actor_avatar, biography, birthday
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        slug,
        gender,
        nationality.trim(),
        actor_avatar || null,
        biography.trim(),
        birthday,
      ]
    );
    return result.insertId;
  }

  async updateWithConnection(connection, actorId, data) { // ✅ đổi tên tham số
    const {
      name,
      slug,
      gender,
      nationality,
      actor_avatar,
      biography,
      birthday,
    } = data;

    const [result] = await connection.query(
      `
      UPDATE actors
      SET
        name = ?,
        slug = ?,
        gender = ?,
        nationality = ?,
        actor_avatar = ?,
        biography = ?,
        birthday = ?
      WHERE actor_id = ?
      `,
      [
        name.trim(),
        slug,
        gender,
        nationality.trim(),
        actor_avatar || null,
        biography.trim(),
        birthday,
        actorId,
      ]
    );
    return result.affectedRows;
  }

  async deleteWithConnection(connection, actorId) { // ✅ đổi tên tham số
    const [result] = await connection.query(
      `DELETE FROM actors WHERE actor_id = ?`,
      [actorId]
    );
    return result.affectedRows;
  }
}

module.exports = new ActorRepository();
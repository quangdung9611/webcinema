const db = require("../Config/db");

class RoomRepository {
  async findAll() {
    const sql = `
      SELECT
        r.room_id,
        r.room_name,
        r.room_type,
        r.total_seats,
        DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
        c.cinema_id,
        c.cinema_name,
        c.city
      FROM rooms r
      JOIN cinemas c ON r.cinema_id = c.cinema_id
      ORDER BY r.room_id DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM rooms WHERE room_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByCinema(cinemaId) {
    const [rows] = await db.query(
      `SELECT room_id, room_name, room_type, total_seats
       FROM rooms
       WHERE cinema_id = ?
       ORDER BY room_name ASC`,
      [cinemaId]
    );
    return rows;
  }

  async findByNameInCinema(roomName, cinemaId, excludeId = null) {
    let sql = `SELECT room_id FROM rooms WHERE room_name = ? AND cinema_id = ?`;
    const params = [roomName.trim(), cinemaId];
    if (excludeId) {
      sql += ` AND room_id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async create(data) {
    const { room_name, cinema_id, room_type } = data;
    const [result] = await db.query(
      `INSERT INTO rooms (room_name, cinema_id, room_type) VALUES (?, ?, ?)`,
      [room_name.trim(), cinema_id, room_type]
    );
    return result.insertId;
  }

  async update(id, data) {
    const { room_name, cinema_id, room_type } = data;
    const [result] = await db.query(
      `UPDATE rooms SET room_name = ?, cinema_id = ?, room_type = ? WHERE room_id = ?`,
      [room_name.trim(), cinema_id, room_type, id]
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await db.query(
      `DELETE FROM rooms WHERE room_id = ?`,
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = new RoomRepository();
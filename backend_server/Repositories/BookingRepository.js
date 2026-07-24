const db = require("../Config/db");

class BookingRepository {
  async findAll() {
    const [rows] = await db.execute(`
      SELECT
        b.booking_id,
        DATE_FORMAT(b.booking_date, '%d/%m/%Y %H:%i') AS booking_date,
        b.total_amount,
        b.status,
        b.memo,
        u.full_name AS customer_name,
        u.email AS customer_email,
        m.title AS movie_title
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
      LEFT JOIN movies m ON s.movie_id = m.movie_id
      ORDER BY b.booking_id DESC
    `);
    return rows;
  }

  async findById(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT * FROM bookings WHERE booking_id = ? LIMIT 1`,
      [bookingId]
    );
    return rows[0] || null;
  }

  async getDetail(connection, bookingId) {
    const [rows] = await connection.query(
      `
      SELECT
        b.booking_id,
        b.user_id,
        b.total_amount,
        b.status,
        b.memo,
        u.full_name,
        u.email,
        m.title AS movie_name,
        m.movie_poster,
        c.cinema_name,
        r.room_name,
        DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
        GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seat_label
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
      LEFT JOIN movies m ON s.movie_id = m.movie_id
      LEFT JOIN cinemas c ON s.cinema_id = c.cinema_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
      WHERE b.booking_id = ?
      GROUP BY b.booking_id
      `,
      [bookingId]
    );
    return rows[0] || null;
  }

  async getFoodDetails(connection, bookingId) {
    const [rows] = await connection.query(
      `
      SELECT item_name, quantity
      FROM booking_details
      WHERE booking_id = ? AND seat_id IS NULL
      `,
      [bookingId]
    );
    return rows;
  }

  async getStatus(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT status FROM bookings WHERE booking_id = ? LIMIT 1`,
      [bookingId]
    );
    return rows[0]?.status || null;
  }

  async updateStatus(connection, bookingId, status) {
    await connection.execute(
      `UPDATE bookings SET status = ? WHERE booking_id = ?`,
      [status, bookingId]
    );
  }

  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM bookings WHERE booking_id = ?`,
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

module.exports = new BookingRepository();
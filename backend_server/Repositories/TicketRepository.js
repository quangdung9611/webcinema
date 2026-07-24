const db = require("../Config/db");

class TicketRepository {
  // ==========================================================
  // LẤY DANH SÁCH VÉ
  // ==========================================================

  async findAll(connection) {
    const [rows] = await connection.query(`
      SELECT t.*, s.seat_row, s.seat_number, s.seat_type,
             u.full_name AS customer_name, u.email AS customer_email,
             m.title AS movie_title, c.cinema_name, r.room_name,
             DATE_FORMAT(sh.start_time, '%Y-%m-%d %H:%i') AS showtime
      FROM tickets t
      LEFT JOIN seats s ON t.seat_id = s.seat_id
      LEFT JOIN bookings b ON t.booking_id = b.booking_id
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN showtimes sh ON t.showtime_id = sh.showtime_id
      LEFT JOIN movies m ON sh.movie_id = m.movie_id
      LEFT JOIN rooms r ON sh.room_id = r.room_id
      LEFT JOIN cinemas c ON sh.cinema_id = c.cinema_id
      ORDER BY t.ticket_id DESC
    `);
    return rows;
  }

  async findByBookingId(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT t.*, s.seat_row, s.seat_number, s.seat_type
       FROM tickets t
       LEFT JOIN seats s ON t.seat_id = s.seat_id
       WHERE t.booking_id = ?`,
      [bookingId]
    );
    return rows;
  }

  async findByShowtimeId(connection, showtimeId) {
    const [rows] = await connection.query(
      `SELECT t.*, s.seat_row, s.seat_number, s.seat_type,
              u.full_name AS customer_name
       FROM tickets t
       LEFT JOIN seats s ON t.seat_id = s.seat_id
       LEFT JOIN bookings b ON t.booking_id = b.booking_id
       LEFT JOIN users u ON b.user_id = u.user_id
       WHERE t.showtime_id = ?
       ORDER BY s.seat_row, s.seat_number`,
      [showtimeId]
    );
    return rows;
  }

  async findByCode(connection, ticketCode) {
    const [rows] = await connection.query(
      `SELECT t.*, s.seat_row, s.seat_number, s.seat_type,
              u.full_name AS customer_name, u.email AS customer_email
       FROM tickets t
       LEFT JOIN seats s ON t.seat_id = s.seat_id
       LEFT JOIN bookings b ON t.booking_id = b.booking_id
       LEFT JOIN users u ON b.user_id = u.user_id
       WHERE t.ticket_code = ?
       LIMIT 1`,
      [ticketCode]
    );
    return rows[0] || null;
  }

  // ==========================================================
  // LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
  // ==========================================================

  async getSeatMapByShowtime(connection, showtimeId) {
    const [rows] = await connection.query(
      `
      SELECT
        s.seat_id,
        s.seat_row,
        s.seat_number,
        s.seat_type,
        s.price,
        t.seat_status,
        t.ticket_status,
        t.ticket_code,
        u.full_name AS customer_name
      FROM seats s
      LEFT JOIN tickets t ON t.seat_id = s.seat_id AND t.showtime_id = ?
      LEFT JOIN bookings b ON t.booking_id = b.booking_id
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE s.room_id = (
        SELECT room_id FROM showtimes WHERE showtime_id = ?
      )
      ORDER BY s.seat_row, s.seat_number
      `,
      [showtimeId, showtimeId]
    );
    return rows;
  }

  // ==========================================================
  // TẠO VÉ (BULK INSERT)
  // ==========================================================

  async createBulk(connection, ticketsData) {
    if (!ticketsData.length) return 0;
    const [result] = await connection.query(
      `
      INSERT INTO tickets
      (booking_id, showtime_id, room_id, cinema_id, seat_id,
       ticket_code, price, seat_status, ticket_status)
      VALUES ?
      `,
      [ticketsData]
    );
    return result.affectedRows;
  }

  // ==========================================================
  // CẬP NHẬT TRẠNG THÁI VÉ
  // ==========================================================

  async updateToBooked(connection, bookingId) {
    const [result] = await connection.execute(
      `
      UPDATE tickets
      SET seat_status = 'Booked',
          ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
          updated_at = NOW()
      WHERE booking_id = ? AND seat_status = 'Reserved'
      `,
      [bookingId]
    );
    return result.affectedRows;
  }

  async updateToCancelled(connection, bookingId) {
    const [result] = await connection.execute(
      `
      UPDATE tickets
      SET seat_status = 'Cancelled',
          updated_at = NOW()
      WHERE booking_id = ?
      `,
      [bookingId]
    );
    return result.affectedRows;
  }

  async releaseReserved(connection, bookingId) {
    const [result] = await connection.execute(
      `
      UPDATE tickets
      SET seat_status = 'Available',
          booking_id = NULL,
          updated_at = NOW()
      WHERE booking_id = ?
      `,
      [bookingId]
    );
    return result.affectedRows;
  }

  async markUsed(connection, ticketId) {
    const [result] = await connection.execute(
      `
      UPDATE tickets
      SET ticket_status = 'Used',
          seat_status = 'Used',
          updated_at = NOW()
      WHERE ticket_id = ?
      `,
      [ticketId]
    );
    return result.affectedRows;
  }

  // ==========================================================
  // KIỂM TRA
  // ==========================================================

  async hasReservedTickets(connection, bookingId) {
    const [rows] = await connection.execute(
      `
      SELECT COUNT(*) AS total
      FROM tickets
      WHERE booking_id = ? AND seat_status = 'Reserved'
      `,
      [bookingId]
    );
    return rows[0].total > 0;
  }

  async getBookingInfo(connection, bookingId) {
    const [rows] = await connection.query(
      `
      SELECT b.showtime_id, s.room_id, s.cinema_id
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.showtime_id
      WHERE b.booking_id = ?
      `,
      [bookingId]
    );
    return rows[0] || null;
  }

  async getSeatDetails(connection, bookingId) {
    const [rows] = await connection.query(
      `
      SELECT seat_id, price
      FROM booking_details
      WHERE booking_id = ? AND seat_id IS NOT NULL
      `,
      [bookingId]
    );
    return rows;
  }
}

module.exports = new TicketRepository();
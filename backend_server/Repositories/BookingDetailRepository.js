const db = require("../Config/db");

class BookingDetailRepository {
  async findByBookingId(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT booking_detail_id, product_id, item_name, quantity, price, seat_id, created_at
       FROM booking_details
       WHERE booking_id = ?
       ORDER BY booking_detail_id ASC`,
      [bookingId]
    );
    return rows;
  }

  async findByBookingIdWithSeat(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT bd.*, s.seat_row, s.seat_number, s.seat_type
       FROM booking_details bd
       LEFT JOIN seats s ON bd.seat_id = s.seat_id
       WHERE bd.booking_id = ?
       ORDER BY bd.booking_detail_id ASC`,
      [bookingId]
    );
    return rows;
  }

  async findFoodItems(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT item_name, quantity, price
       FROM booking_details
       WHERE booking_id = ? AND seat_id IS NULL`,
      [bookingId]
    );
    return rows;
  }

  async findSeatItems(connection, bookingId) {
    const [rows] = await connection.query(
      `SELECT item_name, seat_id
       FROM booking_details
       WHERE booking_id = ? AND seat_id IS NOT NULL`,
      [bookingId]
    );
    return rows;
  }

  async create(connection, data) {
    const { booking_id, product_id, item_name, quantity, price, seat_id } = data;
    const [result] = await connection.query(
      `INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price, seat_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [booking_id, product_id || null, item_name, quantity || 1, price, seat_id || null]
    );
    return result.insertId;
  }

  async deleteByBookingId(connection, bookingId) {
    const [result] = await connection.query(
      `DELETE FROM booking_details WHERE booking_id = ?`,
      [bookingId]
    );
    return result.affectedRows;
  }

  async deleteById(connection, detailId) {
    const [result] = await connection.query(
      `DELETE FROM booking_details WHERE booking_detail_id = ?`,
      [detailId]
    );
    return result.affectedRows;
  }
}

module.exports = new BookingDetailRepository();
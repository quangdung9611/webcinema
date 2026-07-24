const db = require("../Config/db");

class SeatRepository {
  async findSeatsByRoom(roomId) {
    const [rows] = await db.query(
      "SELECT * FROM seats WHERE room_id = ? ORDER BY seat_row, seat_number",
      [roomId]
    );
    return rows;
  }

  async findSeatsByShowtime(showtimeId, roomId) {
    const sql = `
      SELECT s.*, 
      CASE 
        WHEN s.is_active = 0 THEN 'Maintenance'
        WHEN t.ticket_id IS NOT NULL AND b.status = 'Completed' THEN 'Booked'
        ELSE 'Available'
      END as seat_status
      FROM seats s
      LEFT JOIN tickets t ON s.seat_id = t.seat_id AND t.showtime_id = ?
      LEFT JOIN bookings b ON t.booking_id = b.booking_id
      WHERE s.room_id = ? 
      ORDER BY s.seat_row ASC, s.seat_number ASC
    `;
    const [rows] = await db.query(sql, [showtimeId, roomId]);
    return rows;
  }

  async getRoomInfo(showtimeId) {
    const [rows] = await db.query(
      "SELECT room_id FROM showtimes WHERE showtime_id = ?",
      [showtimeId]
    );
    return rows[0] || null;
  }

  async deleteAllByRoom(roomId) {
    const [result] = await db.query(
      "DELETE FROM seats WHERE room_id = ?",
      [roomId]
    );
    return result.affectedRows;
  }

  async updateActiveStatus(seatId, isActive) {
    const [result] = await db.query(
      "UPDATE seats SET is_active = ? WHERE seat_id = ?",
      [isActive, seatId]
    );
    return result.affectedRows;
  }

  async updateTypeAndPrice(seatId, seatType, price) {
    const [result] = await db.query(
      "UPDATE seats SET seat_type = ?, price = ? WHERE seat_id = ?",
      [seatType, price, seatId]
    );
    return result.affectedRows;
  }

  async bulkInsert(seatsData) {
    if (!seatsData.length) return 0;
    const sql = "INSERT INTO seats (room_id, cinema_id, seat_row, seat_number, seat_type, price, is_active) VALUES ?";
    const [result] = await db.query(sql, [seatsData]);
    return result.affectedRows;
  }

  async updateRoomTotalSeats(roomId, totalSeats) {
    await db.query("UPDATE rooms SET total_seats = ? WHERE room_id = ?", [totalSeats, roomId]);
  }
}

module.exports = new SeatRepository();
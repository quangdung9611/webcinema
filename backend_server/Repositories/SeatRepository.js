const db = require("../Config/db");

class SeatRepository {

  // ==========================================================
  // ADMIN - LẤY DANH SÁCH GHẾ THEO PHÒNG
  // ==========================================================

  async findSeatsByRoom(roomId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM seats
      WHERE room_id = ?
      ORDER BY seat_row ASC, seat_number ASC
      `,
      [roomId]
    );

    return rows;
  }


  // ==========================================================
  // PUBLIC - LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
  // ==========================================================

  async findSeatsByShowtime(showtimeId, roomId) {

    const sql = `
      SELECT
        s.*,

        CASE
          WHEN s.is_active = 0
            THEN 'Maintenance'

          WHEN t.ticket_id IS NOT NULL
            AND b.status = 'Completed'
            THEN 'Booked'

          ELSE 'Available'
        END AS seat_status

      FROM seats s

      LEFT JOIN tickets t
        ON s.seat_id = t.seat_id
        AND t.showtime_id = ?

      LEFT JOIN bookings b
        ON t.booking_id = b.booking_id

      WHERE s.room_id = ?

      ORDER BY
        s.seat_row ASC,
        s.seat_number ASC
    `;

    const [rows] = await db.query(
      sql,
      [showtimeId, roomId]
    );

    return rows;
  }


  // ==========================================================
  // LẤY THÔNG TIN PHÒNG CỦA SUẤT CHIẾU
  // ==========================================================

  async getRoomInfo(showtimeId) {

    const [rows] = await db.query(
      `
      SELECT room_id
      FROM showtimes
      WHERE showtime_id = ?
      `,
      [showtimeId]
    );

    return rows[0] || null;
  }


  // ==========================================================
  // XÓA TOÀN BỘ GHẾ TRONG PHÒNG
  // ==========================================================

  async deleteAllByRoom(roomId) {

    const [result] = await db.query(
      `
      DELETE FROM seats
      WHERE room_id = ?
      `,
      [roomId]
    );

    return result.affectedRows;
  }


  // ==========================================================
  // ADMIN - LẤY THÔNG TIN GHẾ THEO SEAT ID
  //
  // Dùng để xác định:
  //
  // STANDARD / VIP / DELUXE / RECLINER
  // → ghế đơn
  //
  // COUPLE
  // → cần tìm ghế còn lại trong cặp
  // ==========================================================

  async findSeatById(seatId) {

    const [rows] = await db.query(
      `
      SELECT
        seat_id,
        room_id,
        cinema_id,
        seat_row,
        seat_number,
        seat_type,
        price,
        is_active
      FROM seats
      WHERE seat_id = ?
      LIMIT 1
      `,
      [seatId]
    );

    return rows[0] || null;
  }


  // ==========================================================
  // ADMIN - CẬP NHẬT TRẠNG THÁI GHẾ
  //
  // LOGIC:
  //
  // 1. Ghế đơn:
  //    → chỉ update chính ghế đó.
  //
  // 2. COUPLE:
  //    → update cả 2 ghế vật lý trong cặp.
  //
  // Ví dụ:
  //
  // L1 + L2
  // L3 + L4
  // L5 + L6
  //
  // Nếu click L1:
  // → L1 + L2 cùng is_active = 0
  //
  // Nếu click L2:
  // → vẫn L1 + L2 cùng is_active = 0
  // ==========================================================

  async updateActiveStatus(seatId, isActive) {

    // ========================================================
    // LẤY GHẾ GỐC
    // ========================================================

    const seat = await this.findSeatById(seatId);

    if (!seat) {
      return 0;
    }


    // ========================================================
    // GHẾ COUPLE
    // ========================================================

    if (
      String(seat.seat_type).toUpperCase() === "COUPLE"
    ) {

      const currentNumber =
        Number(seat.seat_number);

      // ------------------------------------------------------
      // Xác định ghế còn lại trong cặp
      //
      // 1 ↔ 2
      // 3 ↔ 4
      // 5 ↔ 6
      // ...
      // ------------------------------------------------------

      const pairNumber =
        currentNumber % 2 === 1
          ? currentNumber + 1
          : currentNumber - 1;


      // ------------------------------------------------------
      // Update cả cặp
      //
      // Phải cùng:
      // - room_id
      // - seat_row
      // - seat_type = COUPLE
      //
      // để tránh ảnh hưởng ghế phòng/hàng khác.
      // ------------------------------------------------------

      const [result] = await db.query(
        `
        UPDATE seats

        SET is_active = ?

        WHERE room_id = ?
          AND seat_row = ?
          AND seat_type = 'COUPLE'
          AND seat_number IN (?, ?)
        `,
        [
          isActive,
          seat.room_id,
          seat.seat_row,
          currentNumber,
          pairNumber
        ]
      );

      return result.affectedRows;
    }


    // ========================================================
    // GHẾ ĐƠN
    //
    // STANDARD
    // VIP
    // DELUXE
    // RECLINER
    // ========================================================

    const [result] = await db.query(
      `
      UPDATE seats

      SET is_active = ?

      WHERE seat_id = ?
      `,
      [
        isActive,
        seatId
      ]
    );

    return result.affectedRows;
  }


  // ==========================================================
  // ADMIN - CẬP NHẬT LOẠI GHẾ + GIÁ
  // ==========================================================

  async updateTypeAndPrice(
    seatId,
    seatType,
    price
  ) {

    const [result] = await db.query(
      `
      UPDATE seats

      SET
        seat_type = ?,
        price = ?

      WHERE seat_id = ?
      `,
      [
        seatType,
        price,
        seatId
      ]
    );

    return result.affectedRows;
  }


  // ==========================================================
  // KHỞI TẠO GHẾ HÀNG LOẠT
  // ==========================================================

  async bulkInsert(seatsData) {

    if (!seatsData || !seatsData.length) {
      return 0;
    }

    const sql = `
      INSERT INTO seats
      (
        room_id,
        cinema_id,
        seat_row,
        seat_number,
        seat_type,
        price,
        is_active
      )
      VALUES ?
    `;

    const [result] = await db.query(
      sql,
      [seatsData]
    );

    return result.affectedRows;
  }


  // ==========================================================
  // CẬP NHẬT TỔNG SỐ GHẾ CỦA PHÒNG
  // ==========================================================

  async updateRoomTotalSeats(
    roomId,
    totalSeats
  ) {

    await db.query(
      `
      UPDATE rooms
      SET total_seats = ?
      WHERE room_id = ?
      `,
      [
        totalSeats,
        roomId
      ]
    );
  }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = new SeatRepository();
const db = require("../Config/db");

class ShowtimeRepository {
  async findAll() {
    const [rows] = await db.query(`
      SELECT
        s.showtime_id,
        DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
        m.title,
        m.duration,
        c.cinema_name,
        r.room_name,
        r.room_type
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.movie_id
      JOIN cinemas c ON s.cinema_id = c.cinema_id
      JOIN rooms r ON s.room_id = r.room_id
      ORDER BY s.start_time DESC
    `);
    return rows;
  }

  async findById(showtimeId) {
    const [rows] = await db.query(`
      SELECT
        s.showtime_id,
        s.movie_id,
        s.cinema_id,
        s.room_id,
        DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
        m.title,
        m.slug,
        m.movie_poster,
        m.age_rating,
        r.room_name,
        r.room_type,
        c.cinema_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.movie_id
      JOIN rooms r ON s.room_id = r.room_id
      JOIN cinemas c ON s.cinema_id = c.cinema_id
      WHERE s.showtime_id = ?
    `, [showtimeId]);
    return rows[0] || null;
  }

  async findByMovie(movieId) {
    const [rows] = await db.query(`
      SELECT
        s.showtime_id,
        DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
        r.room_name,
        r.room_type,
        c.cinema_name
      FROM showtimes s
      JOIN rooms r ON s.room_id = r.room_id
      JOIN cinemas c ON s.cinema_id = c.cinema_id
      WHERE s.movie_id = ? AND s.start_time >= NOW()
      ORDER BY s.start_time ASC
    `, [movieId]);
    return rows;
  }

  async findConflict(roomId, startTime, excludeShowtimeId = null) {
    let sql = `
      SELECT showtime_id
      FROM showtimes
      WHERE room_id = ?
      AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ?
    `;
    const params = [roomId, startTime];
    if (excludeShowtimeId) {
      sql += ` AND showtime_id != ?`;
      params.push(excludeShowtimeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  async isPastTime(startTime) {
    const [rows] = await db.query(`
      SELECT CASE
        WHEN STR_TO_DATE(?, '%Y-%m-%d %H:%i') < NOW()
        THEN 1 ELSE 0
      END AS isPast
    `, [startTime]);
    return rows[0]?.isPast === 1;
  }

  async hasTickets(showtimeId) {
    const [rows] = await db.query(
      `SELECT ticket_id FROM tickets WHERE showtime_id = ? LIMIT 1`,
      [showtimeId]
    );
    return rows[0] || null;
  }

  async getQuickBookingMovies() {
    const [rows] = await db.query(`
      SELECT DISTINCT m.movie_id, m.title
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.movie_id
      WHERE s.start_time >= NOW()
    `);
    return rows;
  }

  async getQuickBookingCinemas(movieId) {
    const [rows] = await db.query(`
      SELECT DISTINCT c.cinema_id, c.cinema_name
      FROM showtimes s
      JOIN cinemas c ON s.cinema_id = c.cinema_id
      WHERE s.movie_id = ? AND s.start_time >= NOW()
    `, [movieId]);
    return rows;
  }

  async getQuickBookingDates(movieId, cinemaId) {
    const [rows] = await db.query(`
      SELECT DISTINCT DATE_FORMAT(start_time, '%Y-%m-%d') AS show_date
      FROM showtimes
      WHERE movie_id = ? AND cinema_id = ? AND start_time >= NOW()
      ORDER BY show_date ASC
    `, [movieId, cinemaId]);
    return rows;
  }

  async getQuickBookingTimes(movieId, cinemaId, date) {
    const [rows] = await db.query(`
      SELECT
        s.showtime_id,
        DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
        r.room_name
      FROM showtimes s
      JOIN rooms r ON s.room_id = r.room_id
      WHERE s.movie_id = ? AND s.cinema_id = ? AND DATE(s.start_time) = ? AND s.start_time >= NOW()
      ORDER BY s.start_time ASC
    `, [movieId, cinemaId, date]);
    return rows;
  }

  async getShowtimesForBooking(movieId, cinemaId, date) {
    const [rows] = await db.query(`
      SELECT
        s.showtime_id,
        DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
        r.room_name,
        r.room_type
      FROM showtimes s
      JOIN rooms r ON s.room_id = r.room_id
      WHERE s.movie_id = ? AND s.cinema_id = ? AND DATE(s.start_time) = ? AND s.start_time >= NOW()
      ORDER BY s.start_time ASC
    `, [movieId, cinemaId, date]);
    return rows;
  }

  async filterShowtimes(movieId, roomId, date) {
    const [rows] = await db.query(`
      SELECT
        showtime_id,
        DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') AS start_time,
        room_id
      FROM showtimes
      WHERE movie_id = ? AND room_id = ? AND DATE(start_time) = ?
      ORDER BY start_time ASC
    `, [movieId, roomId, date]);
    return rows;
  }

  async create(data) {
    const { movie_id, cinema_id, room_id, start_time } = data;
    const [result] = await db.query(`
      INSERT INTO showtimes (movie_id, cinema_id, room_id, start_time)
      VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i'))
    `, [movie_id, cinema_id, room_id, start_time]);
    return result.insertId;
  }

  async update(showtimeId, data) {
    const { movie_id, cinema_id, room_id, start_time } = data;
    const [result] = await db.query(`
      UPDATE showtimes
      SET movie_id = ?, cinema_id = ?, room_id = ?,
          start_time = STR_TO_DATE(?, '%Y-%m-%d %H:%i')
      WHERE showtime_id = ?
    `, [movie_id, cinema_id, room_id, start_time, showtimeId]);
    return result.affectedRows;
  }

  async delete(showtimeId) {
    const [result] = await db.query(
      `DELETE FROM showtimes WHERE showtime_id = ?`,
      [showtimeId]
    );
    return result.affectedRows;
  }
}

module.exports = new ShowtimeRepository();
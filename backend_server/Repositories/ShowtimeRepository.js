const db = require("../Config/db");

class ShowtimeRepository {

    /*=========================================================
        FIND ALL - KHÔNG PHÂN TRANG
        PUBLIC
    =========================================================*/
    async findAllAll(search = "") {
        search = typeof search === "string" ? search.trim() : "";

        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE m.title LIKE ?
                   OR c.cinema_name LIKE ?
                   OR r.room_name LIKE ?
            `;

            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
                s.movie_id,
                s.cinema_id,
                s.room_id,
                m.title,
                m.duration,
                c.cinema_name,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            JOIN rooms r
                ON s.room_id = r.room_id
            ${whereClause}
            ORDER BY s.start_time DESC
            `,
            queryParams
        );

        return rows;
    }

    /*=========================================================
        FIND ALL - CÓ PHÂN TRANG
        ADMIN
    =========================================================*/
    async findAll(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";

        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE m.title LIKE ?
                   OR c.cinema_name LIKE ?
                   OR r.room_name LIKE ?
            `;

            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
                s.movie_id,
                s.cinema_id,
                s.room_id,
                m.title,
                m.duration,
                c.cinema_name,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            JOIN rooms r
                ON s.room_id = r.room_id
            ${whereClause}
            ORDER BY s.start_time DESC
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            JOIN rooms r
                ON s.room_id = r.room_id
            ${whereClause}
            `,
            queryParams
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /*=========================================================
        FIND BY CINEMA + ROOM
    =========================================================*/
    async findByCinemaAndRoom(cinemaId, roomId) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
                s.movie_id,
                s.cinema_id,
                s.room_id,
                m.title,
                m.duration,
                c.cinema_name,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            JOIN rooms r
                ON s.room_id = r.room_id
            WHERE s.cinema_id = ?
              AND s.room_id = ?
            ORDER BY s.start_time DESC
            `,
            [cinemaId, roomId]
        );

        return rows;
    }

    /*=========================================================
        FIND BY ID
    =========================================================*/
    async findById(showtimeId) {
        const [rows] = await db.query(
            `
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
                m.duration,

                r.room_name,
                r.room_type,

                c.cinema_name
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            JOIN rooms r
                ON s.room_id = r.room_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            WHERE s.showtime_id = ?
            LIMIT 1
            `,
            [showtimeId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        FIND BY MOVIE
    =========================================================*/
    async findByMovie(movieId) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
                r.room_name,
                r.room_type,
                c.cinema_name
            FROM showtimes s
            JOIN rooms r
                ON s.room_id = r.room_id
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ?
              AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId]
        );

        return rows;
    }

    /*=========================================================
        GET MOVIE INFO
        DÙNG CHO BULK
    =========================================================*/
    async getMovieInfo(movieId) {
        const [rows] = await db.query(
            `
            SELECT
                movie_id,
                title,
                duration,
                status
            FROM movies
            WHERE movie_id = ?
            LIMIT 1
            `,
            [movieId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        GET MULTIPLE MOVIES
        DÙNG CHO BULK
    =========================================================*/
    async getMoviesByIds(movieIds) {
        if (!Array.isArray(movieIds) || movieIds.length === 0) {
            return [];
        }

        const placeholders = movieIds.map(() => "?").join(",");

        const [rows] = await db.query(
            `
            SELECT
                movie_id,
                title,
                duration,
                status
            FROM movies
            WHERE movie_id IN (${placeholders})
            `,
            movieIds
        );

        return rows;
    }

    /*=========================================================
        GET ROOM INFO
    =========================================================*/
    async getRoomInfo(roomId) {
        const [rows] = await db.query(
            `
            SELECT
                room_id,
                cinema_id,
                room_name,
                room_type,
                total_seats
            FROM rooms
            WHERE room_id = ?
            LIMIT 1
            `,
            [roomId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        GET MULTIPLE ROOMS
    =========================================================*/
    async getRoomsByIds(roomIds) {
        if (!Array.isArray(roomIds) || roomIds.length === 0) {
            return [];
        }

        const placeholders = roomIds.map(() => "?").join(",");

        const [rows] = await db.query(
            `
            SELECT
                room_id,
                cinema_id,
                room_name,
                room_type,
                total_seats
            FROM rooms
            WHERE room_id IN (${placeholders})
            `,
            roomIds
        );

        return rows;
    }

    /*=========================================================
        CHECK SHOWTIME CONFLICT
        CHỈ KIỂM TRA ĐÚNG GIỜ
    =========================================================*/
    async findConflict(roomId, startTime, excludeShowtimeId = null) {
        let sql = `
            SELECT
                showtime_id,
                movie_id,
                room_id,
                start_time
            FROM showtimes
            WHERE room_id = ?
              AND DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') = ?
        `;

        const params = [roomId, startTime];

        if (excludeShowtimeId) {
            sql += ` AND showtime_id != ?`;
            params.push(excludeShowtimeId);
        }

        sql += `
            LIMIT 1
        `;

        const [rows] = await db.query(sql, params);

        return rows[0] || null;
    }

    /*=========================================================
        CHECK CHỒNG THỜI GIAN
        room + start + duration
    =========================================================*/
    async findTimeOverlap(
        roomId,
        startTime,
        endTime,
        excludeShowtimeId = null
    ) {
        let sql = `
            SELECT
                s.showtime_id,
                s.movie_id,
                s.room_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
                m.title,
                m.duration
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            WHERE s.room_id = ?

              AND s.start_time < STR_TO_DATE(?, '%Y-%m-%d %H:%i')

              AND DATE_ADD(
                    s.start_time,
                    INTERVAL COALESCE(m.duration, 0) + 20 MINUTE
                  ) > STR_TO_DATE(?, '%Y-%m-%d %H:%i')
        `;

        const params = [
            roomId,
            endTime,
            startTime
        ];

        if (excludeShowtimeId) {
            sql += `
                AND s.showtime_id != ?
            `;
            params.push(excludeShowtimeId);
        }

        sql += `
            ORDER BY s.start_time ASC
            LIMIT 1
        `;

        const [rows] = await db.query(sql, params);

        return rows[0] || null;
    }

    /*=========================================================
        CHECK PAST TIME
    =========================================================*/
    async isPastTime(startTime) {
        const [rows] = await db.query(
            `
            SELECT
                CASE
                    WHEN STR_TO_DATE(?, '%Y-%m-%d %H:%i') < NOW()
                    THEN 1
                    ELSE 0
                END AS isPast
            `,
            [startTime]
        );

        return Number(rows[0]?.isPast || 0) === 1;
    }

    /*=========================================================
        CHECK TICKETS
    =========================================================*/
    async hasTickets(showtimeId) {
        const [rows] = await db.query(
            `
            SELECT ticket_id
            FROM tickets
            WHERE showtime_id = ?
            LIMIT 1
            `,
            [showtimeId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        QUICK BOOKING
    =========================================================*/
    async getQuickBookingMovies() {
        const [rows] = await db.query(
            `
            SELECT DISTINCT
                m.movie_id,
                m.title
            FROM showtimes s
            JOIN movies m
                ON s.movie_id = m.movie_id
            WHERE s.start_time >= NOW()
            ORDER BY m.title ASC
            `
        );

        return rows;
    }

    async getQuickBookingCinemas(movieId) {
        const [rows] = await db.query(
            `
            SELECT DISTINCT
                c.cinema_id,
                c.cinema_name
            FROM showtimes s
            JOIN cinemas c
                ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ?
              AND s.start_time >= NOW()
            ORDER BY c.cinema_name ASC
            `,
            [movieId]
        );

        return rows;
    }

    async getQuickBookingDates(movieId, cinemaId) {
        const [rows] = await db.query(
            `
            SELECT DISTINCT
                DATE_FORMAT(start_time, '%Y-%m-%d') AS show_date
            FROM showtimes
            WHERE movie_id = ?
              AND cinema_id = ?
              AND start_time >= NOW()
            ORDER BY show_date ASC
            `,
            [movieId, cinemaId]
        );

        return rows;
    }

    async getQuickBookingTimes(movieId, cinemaId, date) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
                r.room_name
            FROM showtimes s
            JOIN rooms r
                ON s.room_id = r.room_id
            WHERE s.movie_id = ?
              AND s.cinema_id = ?
              AND DATE(s.start_time) = ?
              AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId, cinemaId, date]
        );

        return rows;
    }

    async getShowtimesForBooking(movieId, cinemaId, date) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN rooms r
                ON s.room_id = r.room_id
            WHERE s.movie_id = ?
              AND s.cinema_id = ?
              AND DATE(s.start_time) = ?
              AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId, cinemaId, date]
        );

        return rows;
    }

    async filterShowtimes(movieId, roomId, date) {
        const [rows] = await db.query(
            `
            SELECT
                showtime_id,
                DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') AS start_time,
                room_id
            FROM showtimes
            WHERE movie_id = ?
              AND room_id = ?
              AND DATE(start_time) = ?
            ORDER BY start_time ASC
            `,
            [movieId, roomId, date]
        );

        return rows;
    }

    /*=========================================================
        MOVIE DETAIL
    =========================================================*/
    async findByMovieCinemaDateForDetail(movieId, cinemaId, date) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
                s.room_id,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN rooms r
                ON s.room_id = r.room_id
            WHERE s.movie_id = ?
              AND s.cinema_id = ?
              AND DATE(s.start_time) = ?
              AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId, cinemaId, date]
        );

        return rows;
    }

    /*=========================================================
        CREATE
    =========================================================*/
    async create(data) {
        const {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO showtimes
                (movie_id, cinema_id, room_id, start_time)
            VALUES
                (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i'))
            `,
            [
                movie_id,
                cinema_id,
                room_id,
                start_time
            ]
        );

        return result.insertId;
    }

    /*=========================================================
        BULK INSERT
    =========================================================*/
    async bulkInsert(showtimesData) {
        if (!Array.isArray(showtimesData) || showtimesData.length === 0) {
            return 0;
        }

        const [result] = await db.query(
            `
            INSERT INTO showtimes
                (movie_id, cinema_id, room_id, start_time)
            VALUES ?
            `,
            [showtimesData]
        );

        return result.affectedRows;
    }

    /*=========================================================
        UPDATE
    =========================================================*/
    async update(showtimeId, data) {
        const {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;

        const [result] = await db.query(
            `
            UPDATE showtimes
            SET
                movie_id = ?,
                cinema_id = ?,
                room_id = ?,
                start_time = STR_TO_DATE(?, '%Y-%m-%d %H:%i')
            WHERE showtime_id = ?
            `,
            [
                movie_id,
                cinema_id,
                room_id,
                start_time,
                showtimeId
            ]
        );

        return result.affectedRows;
    }

    /*=========================================================
        DELETE
    =========================================================*/
    async delete(showtimeId) {
        const [result] = await db.query(
            `
            DELETE FROM showtimes
            WHERE showtime_id = ?
            `,
            [showtimeId]
        );

        return result.affectedRows;
    }
}

module.exports = new ShowtimeRepository();
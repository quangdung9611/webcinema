const db = require("../Config/db");

class ShowtimeRepository {

    /*=========================================================
        FIND ALL - KHÔNG PHÂN TRANG
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
                m.title,
                m.duration,
                c.cinema_name,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            JOIN rooms r ON s.room_id = r.room_id
            ${whereClause}
            ORDER BY s.start_time DESC
            `,
            queryParams
        );

        return rows;
    }

    /*=========================================================
        FIND ALL - CÓ PHÂN TRANG
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
                m.title,
                m.duration,
                c.cinema_name,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            JOIN rooms r ON s.room_id = r.room_id
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
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            JOIN rooms r ON s.room_id = r.room_id
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
                m.title,
                m.duration,
                m.movie_id,
                c.cinema_name,
                c.cinema_id,
                r.room_name,
                r.room_id,
                r.room_type
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            JOIN rooms r ON s.room_id = r.room_id
            WHERE c.cinema_id = ? AND r.room_id = ?
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
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
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
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN rooms r ON s.room_id = r.room_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ? AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId]
        );

        return rows;
    }

    /*=========================================================
        FIND ROOM IN CINEMA
    =========================================================*/
    async findRoomInCinema(roomId, cinemaId) {
        const [rows] = await db.query(
            `
            SELECT room_id, cinema_id, room_name, room_type
            FROM rooms
            WHERE room_id = ? AND cinema_id = ?
            LIMIT 1
            `,
            [roomId, cinemaId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        FIND ROOMS BY CINEMA - DÙNG CHO AUTO SCHEDULER
    =========================================================*/
    async findRoomsByCinema(cinemaId) {
        const [rows] = await db.query(
            `
            SELECT 
                room_id,
                room_name,
                room_type
            FROM rooms
            WHERE cinema_id = ?
            ORDER BY room_name ASC
            `,
            [cinemaId]
        );

        return rows;
    }

    /*=========================================================
        GET MOVIE DURATION
    =========================================================*/
    async getMovieDuration(movieId) {
        const [rows] = await db.query(
            `
            SELECT movie_id, duration, title, created_at
            FROM movies
            WHERE movie_id = ?
            LIMIT 1
            `,
            [movieId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        CHECK CONFLICT
    =========================================================*/
    async findConflict(roomId, startTime, endTime = null, excludeShowtimeId = null) {
        if (endTime !== null && Number.isInteger(Number(endTime)) && Number(endTime) > 0) {
            excludeShowtimeId = endTime;
            endTime = null;
        }

        let sql = `
            SELECT s.showtime_id, s.movie_id, s.room_id, s.start_time, m.duration
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.room_id = ?
        `;

        const params = [roomId];

        if (endTime) {
            sql += `
                AND s.start_time < STR_TO_DATE(?, '%Y-%m-%d %H:%i')
                AND DATE_ADD(s.start_time, INTERVAL m.duration MINUTE) > STR_TO_DATE(?, '%Y-%m-%d %H:%i')
            `;
            params.push(endTime, startTime);
        } else {
            sql += `
                AND DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') = ?
            `;
            params.push(startTime);
        }

        if (excludeShowtimeId) {
            sql += ` AND s.showtime_id != ?`;
            params.push(excludeShowtimeId);
        }

        sql += ` LIMIT 1`;

        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    /*=========================================================
        CHECK IF PAST TIME
    =========================================================*/
    async isPastTime(startTime) {
        const [rows] = await db.query(
            `
            SELECT CASE WHEN STR_TO_DATE(?, '%Y-%m-%d %H:%i') < NOW() THEN 1 ELSE 0 END AS isPast
            `,
            [startTime]
        );

        return rows[0]?.isPast === 1;
    }

    /*=========================================================
        CHECK IF HAS TICKETS
    =========================================================*/
    async hasTickets(showtimeId) {
        const [rows] = await db.query(
            `
            SELECT ticket_id FROM tickets WHERE showtime_id = ? LIMIT 1
            `,
            [showtimeId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        GET EXISTING SHOWTIMES
    =========================================================*/
    async getExistingShowtimes({ cinemaId, startDate, endDate, roomIds = [] }) {
        let sql = `
            SELECT
                s.showtime_id,
                s.movie_id,
                s.room_id,
                s.cinema_id,
                DATE_FORMAT(s.start_time, '%Y-%m-%d') AS date,
                DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i') AS start_time,
                m.duration,
                DATE_ADD(s.start_time, INTERVAL m.duration MINUTE) AS end_time,
                TIMESTAMPDIFF(MINUTE, DATE_FORMAT(s.start_time, '%Y-%m-%d 00:00:00'), s.start_time) AS startMinutes,
                TIMESTAMPDIFF(MINUTE, DATE_FORMAT(s.start_time, '%Y-%m-%d 00:00:00'), DATE_ADD(s.start_time, INTERVAL m.duration MINUTE)) AS endMinutes
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.cinema_id = ?
            AND DATE(s.start_time) >= ?
            AND DATE(s.start_time) <= ?
        `;

        const params = [cinemaId, startDate, endDate];

        if (roomIds && roomIds.length > 0) {
            const placeholders = roomIds.map(() => '?').join(',');
            sql += ` AND s.room_id IN (${placeholders})`;
            params.push(...roomIds);
        }

        sql += ` ORDER BY s.start_time ASC`;

        const [rows] = await db.query(sql, params);

        return rows.map(row => ({
            ...row,
            startMinutes: Number(row.startMinutes) || 0,
            endMinutes: Number(row.endMinutes) || 0,
            duration: Number(row.duration) || 0
        }));
    }

    /*=========================================================
        GET ACTIVE MOVIES - LẤY PHIM ĐANG CHIẾU
    =========================================================*/
    async getActiveMovies() {
        const [rows] = await db.query(
            `
            SELECT 
                movie_id,
                title,
                duration,
                created_at,
                status
            FROM movies
            WHERE status IN ('Đang chiếu', 'now_showing')
            ORDER BY created_at ASC
            `
        );
        return rows;
    }

    /*=========================================================
        GET OPERATING HOURS FROM CINEMA
    =========================================================*/
    async getOperatingHours(cinemaId) {
        const [rows] = await db.query(
            `
            SELECT 
                weekday_open,
                weekday_close,
                weekend_open,
                weekend_close
            FROM cinemas
            WHERE cinema_id = ?
            LIMIT 1
            `,
            [cinemaId]
        );
        
        if (rows.length === 0) {
            return {
                weekday: { open: '08:00:00', close: '23:30:00' },
                weekend: { open: '08:00:00', close: '24:00:00' }
            };
        }
        
        const row = rows[0];
        return {
            weekday: {
                open: row.weekday_open || '08:00:00',
                close: row.weekday_close || '23:30:00'
            },
            weekend: {
                open: row.weekend_open || '08:00:00',
                close: row.weekend_close || '24:00:00'
            }
        };
    }

    /*=========================================================
        GET MOVIE SHOWTIME CONFIG (THỦ CÔNG)
    =========================================================*/
   async getMovieShowtimeConfig(movieId, cinemaId, dayType = 'ALL') {
    let rows = [];

    // =========================================================
    // 1. DAY TYPE CỤ THỂ: WEEKDAY / WEEKEND
    // =========================================================
    if (dayType !== 'ALL') {

        // Ưu tiên config riêng của ngày đó
        const [specificRows] = await db.query(`
            SELECT
                time_slot,
                room_type,
                slot_count,
                interval_minutes
            FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
              AND day_type = ?
              AND is_active = 1
            ORDER BY time_slot ASC, room_type ASC
        `, [
            movieId,
            cinemaId,
            dayType
        ]);

        // Nếu có config riêng
        // => CHỈ dùng config riêng
        if (Array.isArray(specificRows) && specificRows.length > 0) {
            rows = specificRows;
        }

        // Nếu KHÔNG có config riêng
        // => mới fallback về ALL
        else {
            const [allRows] = await db.query(`
                SELECT
                    time_slot,
                    room_type,
                    slot_count,
                    interval_minutes
                FROM movie_showtime_config
                WHERE movie_id = ?
                  AND cinema_id = ?
                  AND day_type = 'ALL'
                  AND is_active = 1
                ORDER BY time_slot ASC, room_type ASC
            `, [
                movieId,
                cinemaId
            ]);

            rows = allRows;
        }
    }

    // =========================================================
    // 2. DAY TYPE = ALL
    // =========================================================
    else {

        const [allRows] = await db.query(`
            SELECT
                time_slot,
                room_type,
                slot_count,
                interval_minutes
            FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
              AND day_type = 'ALL'
              AND is_active = 1
            ORDER BY time_slot ASC, room_type ASC
        `, [
            movieId,
            cinemaId
        ]);

        rows = allRows;
    }

    // =========================================================
    // 3. BUILD CONFIG OBJECT
    // =========================================================

    const config = {};

    for (const row of rows) {

        const slot = row.time_slot;

        if (!config[slot]) {
            config[slot] = [];
        }

        config[slot].push({
            room_type: String(row.room_type || '')
                .trim()
                .toUpperCase(),

            slot_count: Number(row.slot_count),

            interval_minutes: Number(row.interval_minutes)
        });
    }

    // =========================================================
    // DEBUG
    // =========================================================

    console.log(
        `🧩 CONFIG LOAD | movie=${movieId} | cinema=${cinemaId} | dayType=${dayType}`
    );

    console.log(
        `   → ${JSON.stringify(config)}`
    );

    return config;
}

    /*=========================================================
        GET MOVIE STATS - ĐÚNG VỚI CSDL CỦA BẠN
    =========================================================*/
    async getMovieStats(movieIds) {
        if (!movieIds || movieIds.length === 0) return {};
        
        const placeholders = movieIds.map(() => '?').join(',');
        const [rows] = await db.query(
            `
            SELECT 
                m.movie_id,
                m.views_count AS viewCount,
                COUNT(DISTINCT t.ticket_id) AS ticketSold,
                AVG(r.rating_score) AS rating
            FROM movies m
            LEFT JOIN showtimes s ON m.movie_id = s.movie_id
            LEFT JOIN tickets t ON s.showtime_id = t.showtime_id AND t.ticket_status IN ('Valid')
            LEFT JOIN reviews r ON m.movie_id = r.movie_id
            WHERE m.movie_id IN (${placeholders})
            GROUP BY m.movie_id
            `,
            movieIds
        );
        
        const stats = {};
        for (const row of rows) {
            stats[row.movie_id] = {
                ticketSold: Number(row.ticketSold) || 0,
                viewCount: Number(row.viewCount) || 0,
                rating: Number(row.rating) || 0
            };
        }
        return stats;
    }

    /*=========================================================
        GET QUICK BOOKING - MOVIES
    =========================================================*/
    async getQuickBookingMovies() {
        const [rows] = await db.query(
            `
            SELECT DISTINCT m.movie_id, m.title
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.start_time >= NOW()
            `
        );

        return rows;
    }

    /*=========================================================
        GET QUICK BOOKING - CINEMAS
    =========================================================*/
    async getQuickBookingCinemas(movieId) {
        const [rows] = await db.query(
            `
            SELECT DISTINCT c.cinema_id, c.cinema_name
            FROM showtimes s
            JOIN cinemas c ON s.cinema_id = c.cinema_id
            WHERE s.movie_id = ? AND s.start_time >= NOW()
            `,
            [movieId]
        );

        return rows;
    }

    /*=========================================================
        GET QUICK BOOKING - DATES
    =========================================================*/
    async getQuickBookingDates(movieId, cinemaId) {
        const [rows] = await db.query(
            `
            SELECT DISTINCT DATE_FORMAT(start_time, '%Y-%m-%d') AS show_date
            FROM showtimes
            WHERE movie_id = ? AND cinema_id = ? AND start_time >= NOW()
            ORDER BY show_date ASC
            `,
            [movieId, cinemaId]
        );

        return rows;
    }

    /*=========================================================
        GET QUICK BOOKING - TIMES
    =========================================================*/
    async getQuickBookingTimes(movieId, cinemaId, date) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
                r.room_name
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            WHERE s.movie_id = ? AND s.cinema_id = ? AND DATE(s.start_time) = ? AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId, cinemaId, date]
        );

        return rows;
    }

    /*=========================================================
        GET SHOWTIMES FOR BOOKING
    =========================================================*/
    async getShowtimesForBooking(movieId, cinemaId, date) {
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(s.start_time, '%H:%i') AS start_time,
                r.room_name,
                r.room_type
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.room_id
            WHERE s.movie_id = ? AND s.cinema_id = ? AND DATE(s.start_time) = ? AND s.start_time >= NOW()
            ORDER BY s.start_time ASC
            `,
            [movieId, cinemaId, date]
        );

        return rows;
    }

    /*=========================================================
        FILTER SHOWTIMES
    =========================================================*/
    async filterShowtimes(movieId, roomId, date) {
        const [rows] = await db.query(
            `
            SELECT
                showtime_id,
                DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') AS start_time,
                room_id
            FROM showtimes
            WHERE movie_id = ? AND room_id = ? AND DATE(start_time) = ?
            ORDER BY start_time ASC
            `,
            [movieId, roomId, date]
        );

        return rows;
    }

    /*=========================================================
        FIND SHOWTIMES FOR MOVIE DETAIL
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
            JOIN rooms r ON s.room_id = r.room_id
            WHERE s.movie_id = ? AND s.cinema_id = ? AND DATE(s.start_time) = ? AND s.start_time >= NOW()
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
        const { movie_id, cinema_id, room_id, start_time } = data;

        const [result] = await db.query(
            `
            INSERT INTO showtimes (movie_id, cinema_id, room_id, start_time)
            VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i'))
            `,
            [movie_id, cinema_id, room_id, start_time]
        );

        return result.insertId;
    }

    /*=========================================================
        UPDATE
    =========================================================*/
    async update(showtimeId, data) {
        const { movie_id, cinema_id, room_id, start_time } = data;

        const [result] = await db.query(
            `
            UPDATE showtimes
            SET movie_id = ?, cinema_id = ?, room_id = ?, start_time = STR_TO_DATE(?, '%Y-%m-%d %H:%i')
            WHERE showtime_id = ?
            `,
            [movie_id, cinema_id, room_id, start_time, showtimeId]
        );

        return result.affectedRows;
    }

    /*=========================================================
        DELETE
    =========================================================*/
    async delete(showtimeId) {
        const [result] = await db.query(
            `
            DELETE FROM showtimes WHERE showtime_id = ?
            `,
            [showtimeId]
        );

        return result.affectedRows;
    }
}

module.exports = new ShowtimeRepository();
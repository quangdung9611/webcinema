
const db = require("../Config/db");

class ShowtimeRepository {

    // ==========================================================
    // LẤY DANH SÁCH SUẤT CHIẾU - PAGINATION
    // Mặc định: 20 suất chiếu / trang
    // Tối đa: 100 suất chiếu / trang
    // ==========================================================
    async findAll(page = 1, limit = 20) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        // Không cho lấy quá nhiều dữ liệu
        if (limit > 100) {
            limit = 100;
        }

        // ------------------------------------------------------
        // TÍNH OFFSET
        // ------------------------------------------------------
        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY DANH SÁCH SHOWTIME
        // ======================================================
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

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

            ORDER BY s.start_time DESC

            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );


        // ======================================================
        // ĐẾM TỔNG SỐ SHOWTIME
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM showtimes
            `
        );

        const total = Number(countRows[0]?.total || 0);


        // ======================================================
        // TÍNH TỔNG SỐ TRANG
        // ======================================================
        const totalPages = Math.ceil(total / limit);


        // ======================================================
        // RETURN
        // ======================================================
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


    // ==========================================================
    // LẤY SHOWTIME THEO ID
    // Không pagination
    // ==========================================================
    async findById(showtimeId) {

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,
                s.movie_id,
                s.cinema_id,
                s.room_id,

                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

                m.title,
                m.slug,
                m.movie_poster,
                m.age_rating,

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


    // ==========================================================
    // LẤY SHOWTIME THEO PHIM
    // Không pagination
    // Frontend cần toàn bộ suất chiếu sắp tới của phim
    // ==========================================================
    async findByMovie(movieId) {

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,

                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i:%s'
                ) AS start_time,

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


    // ==========================================================
    // KIỂM TRA XUNG ĐỘT SUẤT CHIẾU
    // ==========================================================
    async findConflict(
        roomId,
        startTime,
        excludeShowtimeId = null
    ) {

        let sql = `
            SELECT showtime_id
            FROM showtimes
            WHERE room_id = ?
                AND DATE_FORMAT(
                    start_time,
                    '%Y-%m-%d %H:%i'
                ) = ?
        `;

        const params = [
            roomId,
            startTime
        ];

        if (excludeShowtimeId) {

            sql += `
                AND showtime_id != ?
            `;

            params.push(excludeShowtimeId);
        }

        const [rows] = await db.query(
            sql,
            params
        );

        return rows[0] || null;
    }


    // ==========================================================
    // LỌC SHOWTIME THEO RẠP + PHÒNG
    // PAGINATION
    // Mặc định: 20
    // Tối đa: 100
    // ==========================================================
    async findByCinemaAndRoom(
        cinemaId,
        roomId,
        page = 1,
        limit = 20
    ) {

        // ------------------------------------------------------
        // CHUẨN HÓA PAGE / LIMIT
        // ------------------------------------------------------
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (!Number.isInteger(page) || page < 1) {
            page = 1;
        }

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 20;
        }

        if (limit > 100) {
            limit = 100;
        }

        const offset = (page - 1) * limit;


        // ======================================================
        // LẤY SHOWTIME
        // ======================================================
        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,

                DATE_FORMAT(
                    s.start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

                m.title,
                m.duration,
                m.movie_id,

                c.cinema_name,
                c.cinema_id,

                r.room_name,
                r.room_id,
                r.room_type

            FROM showtimes s

            JOIN movies m
                ON s.movie_id = m.movie_id

            JOIN cinemas c
                ON s.cinema_id = c.cinema_id

            JOIN rooms r
                ON s.room_id = r.room_id

            WHERE c.cinema_id = ?
                AND r.room_id = ?

            ORDER BY s.start_time DESC

            LIMIT ? OFFSET ?
            `,
            [
                cinemaId,
                roomId,
                limit,
                offset
            ]
        );


        // ======================================================
        // COUNT
        // ======================================================
        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total

            FROM showtimes s

            WHERE s.cinema_id = ?
                AND s.room_id = ?
            `,
            [
                cinemaId,
                roomId
            ]
        );

        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages = Math.ceil(
            total / limit
        );


        // ======================================================
        // RETURN
        // ======================================================
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


    // ==========================================================
    // KIỂM TRA THỜI GIAN ĐÃ QUA
    // ==========================================================
    async isPastTime(startTime) {

        const [rows] = await db.query(
            `
            SELECT
                CASE
                    WHEN STR_TO_DATE(
                        ?,
                        '%Y-%m-%d %H:%i'
                    ) < NOW()
                    THEN 1
                    ELSE 0
                END AS isPast
            `,
            [startTime]
        );

        return rows[0]?.isPast === 1;
    }


    // ==========================================================
    // KIỂM TRA SHOWTIME ĐÃ CÓ VÉ
    // ==========================================================
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


    // ==========================================================
    // QUICK BOOKING - LẤY MOVIE
    // Không pagination
    // ==========================================================
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
            `
        );

        return rows;
    }


    // ==========================================================
    // QUICK BOOKING - LẤY CINEMA
    // Không pagination
    // ==========================================================
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
            `,
            [movieId]
        );

        return rows;
    }


    // ==========================================================
    // QUICK BOOKING - LẤY NGÀY
    // Không pagination
    // ==========================================================
    async getQuickBookingDates(
        movieId,
        cinemaId
    ) {

        const [rows] = await db.query(
            `
            SELECT DISTINCT
                DATE_FORMAT(
                    start_time,
                    '%Y-%m-%d'
                ) AS show_date

            FROM showtimes

            WHERE movie_id = ?
                AND cinema_id = ?
                AND start_time >= NOW()

            ORDER BY show_date ASC
            `,
            [
                movieId,
                cinemaId
            ]
        );

        return rows;
    }


    // ==========================================================
    // QUICK BOOKING - LẤY GIỜ
    // Không pagination
    // ==========================================================
    async getQuickBookingTimes(
        movieId,
        cinemaId,
        date
    ) {

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,

                DATE_FORMAT(
                    s.start_time,
                    '%H:%i'
                ) AS start_time,

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
            [
                movieId,
                cinemaId,
                date
            ]
        );

        return rows;
    }


    // ==========================================================
    // SHOWTIME CHO BOOKING
    // Không pagination
    // ==========================================================
    async getShowtimesForBooking(
        movieId,
        cinemaId,
        date
    ) {

        const [rows] = await db.query(
            `
            SELECT
                s.showtime_id,

                DATE_FORMAT(
                    s.start_time,
                    '%H:%i'
                ) AS start_time,

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
            [
                movieId,
                cinemaId,
                date
            ]
        );

        return rows;
    }


    // ==========================================================
    // LỌC SHOWTIME THEO MOVIE + ROOM + DATE
    // Không pagination
    // ==========================================================
    async filterShowtimes(
        movieId,
        roomId,
        date
    ) {

        const [rows] = await db.query(
            `
            SELECT
                showtime_id,

                DATE_FORMAT(
                    start_time,
                    '%Y-%m-%d %H:%i'
                ) AS start_time,

                room_id

            FROM showtimes

            WHERE movie_id = ?
                AND room_id = ?
                AND DATE(start_time) = ?

            ORDER BY start_time ASC
            `,
            [
                movieId,
                roomId,
                date
            ]
        );

        return rows;
    }


    // ==========================================================
    // CREATE SHOWTIME
    // ==========================================================
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
            (
                movie_id,
                cinema_id,
                room_id,
                start_time
            )
            VALUES
            (
                ?,
                ?,
                ?,
                STR_TO_DATE(
                    ?,
                    '%Y-%m-%d %H:%i'
                )
            )
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


    // ==========================================================
    // UPDATE SHOWTIME
    // ==========================================================
    async update(
        showtimeId,
        data
    ) {

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
                start_time = STR_TO_DATE(
                    ?,
                    '%Y-%m-%d %H:%i'
                )

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


    // ==========================================================
    // DELETE SHOWTIME
    // ==========================================================
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


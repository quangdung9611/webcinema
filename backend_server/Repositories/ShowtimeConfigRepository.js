// ============================================================
// repositories/ShowtimeConfigRepository.js
// ============================================================

const db = require('../Config/db');

class ShowtimeConfigRepository {

    /*=========================================================
        LẤY CẤU HÌNH CỦA 1 PHIM Ở 1 RẠP (chỉ active)
    =========================================================*/
    async findByMovieAndCinema(movieId, cinemaId) {
        const [rows] = await db.query(
            `
            SELECT
                config_id,
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active,
                created_at,
                updated_at
            FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
              AND is_active = 1
            ORDER BY
                FIELD(
                    day_type,
                    'MONDAY','TUESDAY','WEDNESDAY','THURSDAY',
                    'FRIDAY','SATURDAY','SUNDAY',
                    'WEEKDAY','WEEKEND','ALL'
                ),
                FIELD(
                    time_slot,
                    'MORNING','AFTERNOON','EVENING','NIGHT'
                ),
                FIELD(
                    room_type,
                    '2D','3D','VIP','IMAX'
                ),
                slot_time ASC
            `,
            [movieId, cinemaId]
        );

        return rows;
    }

    /*=========================================================
        LẤY TẤT CẢ CONFIG CỦA 1 PHIM + RẠP (kể cả inactive)
    =========================================================*/
    async findAllByMovieAndCinema(movieId, cinemaId) {
        const [rows] = await db.query(
            `
            SELECT
                config_id,
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active,
                created_at,
                updated_at
            FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
            ORDER BY
                FIELD(
                    day_type,
                    'MONDAY','TUESDAY','WEDNESDAY','THURSDAY',
                    'FRIDAY','SATURDAY','SUNDAY',
                    'WEEKDAY','WEEKEND','ALL'
                ),
                FIELD(
                    time_slot,
                    'MORNING','AFTERNOON','EVENING','NIGHT'
                ),
                FIELD(
                    room_type,
                    '2D','3D','VIP','IMAX'
                ),
                slot_time ASC
            `,
            [movieId, cinemaId]
        );

        return rows;
    }

    /*=========================================================
        XÓA TẤT CẢ CẤU HÌNH CỦA 1 PHIM Ở 1 RẠP
    =========================================================*/
    async deleteByMovieAndCinema(movieId, cinemaId) {
        const [result] = await db.query(
            `
            DELETE FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
            `,
            [movieId, cinemaId]
        );

        return result.affectedRows;
    }

    /*=========================================================
        THÊM 1 CẤU HÌNH MỚI (1 giờ cụ thể)
    =========================================================*/
    async create(data, connection = db) {
        const {
            movie_id,
            cinema_id,
            day_type,
            time_slot,
            slot_time,
            room_type,
            interval_type,
            is_active
        } = data;

        const [result] = await connection.query(
            `
            INSERT INTO movie_showtime_config
            (
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                movie_id,
                cinema_id,
                day_type || 'ALL',
                time_slot,
                slot_time,
                room_type,
                interval_type || 'NORMAL',
                is_active !== undefined ? is_active : 1
            ]
        );

        return result.insertId;
    }

    /*=========================================================
        XÓA 1 CẤU HÌNH THEO ID
    =========================================================*/
    async deleteById(configId, connection = db) {
        const [result] = await connection.query(
            `
            DELETE FROM movie_showtime_config
            WHERE config_id = ?
            `,
            [configId]
        );

        return result.affectedRows;
    }

    /*=========================================================
        LẤY CẤU HÌNH THEO ID
    =========================================================*/
    async findById(configId, connection = db) {
        const [rows] = await connection.query(
            `
            SELECT
                config_id,
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active,
                created_at,
                updated_at
            FROM movie_showtime_config
            WHERE config_id = ?
            LIMIT 1
            `,
            [configId]
        );

        return rows[0] || null;
    }

    /*=========================================================
        KIỂM TRA CONFIG ĐÃ TỒN TẠI CHƯA
        Unique key: (movie, cinema, day, slot, slot_time, room)
    =========================================================*/
    async exists(
        movieId,
        cinemaId,
        timeSlot,
        slotTime,
        roomType,
        dayType,
        connection = db
    ) {
        const [rows] = await connection.query(
            `
            SELECT
                config_id,
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active
            FROM movie_showtime_config
            WHERE movie_id = ?
              AND cinema_id = ?
              AND time_slot = ?
              AND slot_time = ?
              AND room_type = ?
              AND day_type = ?
            LIMIT 1
            `,
            [
                movieId,
                cinemaId,
                timeSlot,
                slotTime,
                roomType,
                dayType
            ]
        );

        return rows[0] || null;
    }

    /*=========================================================
        CẬP NHẬT 1 CẤU HÌNH
    =========================================================*/
    async update(configId, data, connection = db) {
        const {
            day_type,
            time_slot,
            slot_time,
            room_type,
            interval_type,
            is_active
        } = data;

        const [result] = await connection.query(
            `
            UPDATE movie_showtime_config
            SET
                day_type = ?,
                time_slot = ?,
                slot_time = ?,
                room_type = ?,
                interval_type = ?,
                is_active = ?
            WHERE config_id = ?
            `,
            [
                day_type,
                time_slot,
                slot_time,
                room_type,
                interval_type,
                is_active,
                configId
            ]
        );

        return result.affectedRows;
    }

    /*=========================================================
        CẬP NHẬT RIÊNG INTERVAL TYPE
    =========================================================*/
    async updateIntervalType(
        configId,
        intervalType,
        connection = db
    ) {
        const [result] = await connection.query(
            `
            UPDATE movie_showtime_config
            SET interval_type = ?
            WHERE config_id = ?
            `,
            [intervalType, configId]
        );

        return result.affectedRows;
    }

    /*=========================================================
        TRANSACTION - BEGIN
    =========================================================*/
    async beginTransaction() {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /*=========================================================
        COMMIT
    =========================================================*/
    async commit(connection) {
        await connection.commit();
        connection.release();
    }

    /*=========================================================
        ROLLBACK
    =========================================================*/
    async rollback(connection) {
        try {
            await connection.rollback();
        } finally {
            connection.release();
        }
    }
}

module.exports = new ShowtimeConfigRepository();
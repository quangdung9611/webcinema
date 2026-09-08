// repositories/ShowtimeConfigRepository.js

const db = require('../Config/db');

class ShowtimeConfigRepository {

    /*=========================================================
        LẤY CẤU HÌNH CỦA 1 PHIM Ở 1 RẠP
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
                room_type,
                slot_count,
                interval_minutes,
                is_active,
                created_at,
                updated_at
            FROM movie_showtime_config
            WHERE movie_id = ? AND cinema_id = ? AND is_active = 1
            ORDER BY 
                FIELD(time_slot, 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
                FIELD(room_type, '2D', '3D', 'VIP', 'IMAX')
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
            `DELETE FROM movie_showtime_config WHERE movie_id = ? AND cinema_id = ?`,
            [movieId, cinemaId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        THÊM 1 CẤU HÌNH MỚI
    =========================================================*/
    async create(data) {
        const {
            movie_id,
            cinema_id,
            day_type,
            time_slot,
            room_type,
            slot_count,
            interval_minutes,
            is_active
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO movie_showtime_config 
                (movie_id, cinema_id, day_type, time_slot, room_type, slot_count, interval_minutes, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                movie_id,
                cinema_id,
                day_type || 'ALL',
                time_slot,
                room_type,
                slot_count || 1,
                interval_minutes || 45,
                is_active !== undefined ? is_active : 1
            ]
        );
        return result.insertId;
    }

    /*=========================================================
        XÓA 1 CẤU HÌNH THEO ID
    =========================================================*/
    async deleteById(configId) {
        const [result] = await db.query(
            `DELETE FROM movie_showtime_config WHERE config_id = ?`,
            [configId]
        );
        return result.affectedRows;
    }

    /*=========================================================
        LẤY CẤU HÌNH THEO ID
    =========================================================*/
    async findById(configId) {
        const [rows] = await db.query(
            `
            SELECT 
                config_id,
                movie_id,
                cinema_id,
                day_type,
                time_slot,
                room_type,
                slot_count,
                interval_minutes,
                is_active
            FROM movie_showtime_config
            WHERE config_id = ?
            LIMIT 1
            `,
            [configId]
        );
        return rows[0] || null;
    }

    /*=========================================================
        CẬP NHẬT CẤU HÌNH
    =========================================================*/
    async update(configId, data) {
        const {
            day_type,
            time_slot,
            room_type,
            slot_count,
            interval_minutes,
            is_active
        } = data;

        const [result] = await db.query(
            `
            UPDATE movie_showtime_config 
            SET 
                day_type = ?,
                time_slot = ?,
                room_type = ?,
                slot_count = ?,
                interval_minutes = ?,
                is_active = ?
            WHERE config_id = ?
            `,
            [
                day_type || 'ALL',
                time_slot,
                room_type,
                slot_count || 1,
                interval_minutes || 45,
                is_active !== undefined ? is_active : 1,
                configId
            ]
        );
        return result.affectedRows;
    }

    /*=========================================================
        KIỂM TRA CẤU HÌNH ĐÃ TỒN TẠI CHƯA
    =========================================================*/
    async exists(movieId, cinemaId, timeSlot, roomType, dayType) {
        const [rows] = await db.query(
            `
            SELECT config_id 
            FROM movie_showtime_config 
            WHERE movie_id = ? 
                AND cinema_id = ? 
                AND time_slot = ? 
                AND room_type = ? 
                AND day_type = ?
            LIMIT 1
            `,
            [movieId, cinemaId, timeSlot, roomType, dayType]
        );
        return rows[0] || null;
    }
}

module.exports = new ShowtimeConfigRepository();
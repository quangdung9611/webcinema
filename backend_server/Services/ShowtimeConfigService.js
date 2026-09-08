// services/ShowtimeConfigService.js

const ShowtimeConfigRepository = require('../Repositories/ShowtimeConfigRepository');

class ShowtimeConfigService {

    /*=========================================================
        LẤY CẤU HÌNH CỦA 1 PHIM Ở 1 RẠP
    =========================================================*/
    async getConfig(movieId, cinemaId) {
        if (!movieId || !cinemaId) {
            const err = new Error('Thiếu movie_id hoặc cinema_id');
            err.statusCode = 400;
            err.field = 'general';
            throw err;
        }

        const configs = await ShowtimeConfigRepository.findByMovieAndCinema(movieId, cinemaId);
        return configs;
    }

    /*=========================================================
        LƯU CẤU HÌNH CHO 1 PHIM Ở 1 RẠP
    =========================================================*/
    async saveConfig(movieId, cinemaId, configs) {
        if (!movieId || !cinemaId) {
            const err = new Error('Thiếu movie_id hoặc cinema_id');
            err.statusCode = 400;
            err.field = 'general';
            throw err;
        }

        if (!Array.isArray(configs) || configs.length === 0) {
            const err = new Error('Configs phải là mảng và không được rỗng');
            err.statusCode = 400;
            err.field = 'configs';
            throw err;
        }

        // Xóa config cũ
        await ShowtimeConfigRepository.deleteByMovieAndCinema(movieId, cinemaId);

        // Thêm config mới
        let insertedCount = 0;
        for (const config of configs) {
            const {
                time_slot,
                room_type,
                slot_count,
                interval_minutes,
                day_type = 'ALL',
                is_active = 1
            } = config;

            if (!time_slot || !room_type || slot_count <= 0 || interval_minutes <= 0) {
                continue;
            }

            await ShowtimeConfigRepository.create({
                movie_id: movieId,
                cinema_id: cinemaId,
                day_type,
                time_slot,
                room_type,
                slot_count,
                interval_minutes,
                is_active
            });
            insertedCount++;
        }

        return { inserted: insertedCount };
    }

    /*=========================================================
        XÓA 1 CẤU HÌNH
    =========================================================*/
    async deleteConfig(configId) {
        if (!configId) {
            const err = new Error('Thiếu config_id');
            err.statusCode = 400;
            err.field = 'config_id';
            throw err;
        }

        const existing = await ShowtimeConfigRepository.findById(configId);
        if (!existing) {
            const err = new Error('Không tìm thấy cấu hình');
            err.statusCode = 404;
            throw err;
        }

        const affectedRows = await ShowtimeConfigRepository.deleteById(configId);
        if (affectedRows === 0) {
            const err = new Error('Xóa cấu hình thất bại');
            err.statusCode = 500;
            throw err;
        }

        return true;
    }

    /*=========================================================
        CẬP NHẬT 1 CẤU HÌNH
    =========================================================*/
    async updateConfig(configId, data) {
        if (!configId) {
            const err = new Error('Thiếu config_id');
            err.statusCode = 400;
            err.field = 'config_id';
            throw err;
        }

        const existing = await ShowtimeConfigRepository.findById(configId);
        if (!existing) {
            const err = new Error('Không tìm thấy cấu hình');
            err.statusCode = 404;
            throw err;
        }

        const {
            day_type,
            time_slot,
            room_type,
            slot_count,
            interval_minutes,
            is_active
        } = data;

        if (slot_count !== undefined && slot_count <= 0) {
            const err = new Error('Số suất phải lớn hơn 0');
            err.statusCode = 400;
            err.field = 'slot_count';
            throw err;
        }

        if (interval_minutes !== undefined && interval_minutes <= 0) {
            const err = new Error('Khoảng cách phải lớn hơn 0');
            err.statusCode = 400;
            err.field = 'interval_minutes';
            throw err;
        }

        const affectedRows = await ShowtimeConfigRepository.update(configId, {
            day_type: day_type || existing.day_type,
            time_slot: time_slot || existing.time_slot,
            room_type: room_type || existing.room_type,
            slot_count: slot_count || existing.slot_count,
            interval_minutes: interval_minutes || existing.interval_minutes,
            is_active: is_active !== undefined ? is_active : existing.is_active
        });

        if (affectedRows === 0) {
            const err = new Error('Cập nhật cấu hình thất bại');
            err.statusCode = 500;
            throw err;
        }

        return true;
    }
}

module.exports = new ShowtimeConfigService();
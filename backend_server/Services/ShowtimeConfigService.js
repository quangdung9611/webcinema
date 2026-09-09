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

    const ALLOWED_TIME_SLOTS = [
        'MORNING',
        'AFTERNOON',
        'EVENING',
        'NIGHT'
    ];

    const ALLOWED_ROOM_TYPES = [
        '2D',
        '3D',
        'VIP',
        'IMAX'
    ];

    const ALLOWED_DAY_TYPES = [
        'ALL',
        'WEEKDAY',
        'WEEKEND'
    ];

    // =====================================================
    // 1. LỌC CONFIG HỢP LỆ + CHỈ LẤY CONFIG ACTIVE
    // =====================================================

    const validConfigs = configs
        .map(config => ({
            time_slot: String(config.time_slot || '').trim().toUpperCase(),
            room_type: String(config.room_type || '').trim().toUpperCase(),
            slot_count: Number(config.slot_count),
            interval_minutes: Number(config.interval_minutes),
            day_type: String(config.day_type || 'ALL').trim().toUpperCase(),
            is_active: Number(config.is_active) === 1 ? 1 : 0
        }))
        .filter(config => {

            // Không active => không lưu
            if (config.is_active !== 1) {
                return false;
            }

            // Kiểm tra time slot
            if (!ALLOWED_TIME_SLOTS.includes(config.time_slot)) {
                return false;
            }

            // Kiểm tra room type
            if (!ALLOWED_ROOM_TYPES.includes(config.room_type)) {
                return false;
            }

            // Kiểm tra day type
            if (!ALLOWED_DAY_TYPES.includes(config.day_type)) {
                return false;
            }

            // Kiểm tra số suất
            if (
                !Number.isFinite(config.slot_count) ||
                config.slot_count <= 0
            ) {
                return false;
            }

            // Kiểm tra interval
            if (
                !Number.isFinite(config.interval_minutes) ||
                config.interval_minutes <= 0
            ) {
                return false;
            }

            return true;
        });

    // =====================================================
    // 2. PHẢI CÓ ÍT NHẤT 1 CONFIG ACTIVE
    // =====================================================

    if (validConfigs.length === 0) {
        const err = new Error(
            'Không có cấu hình suất chiếu hợp lệ và đang hoạt động'
        );

        err.statusCode = 400;
        err.field = 'configs';

        throw err;
    }

    // =====================================================
    // 3. XÓA TOÀN BỘ CONFIG CŨ
    // =====================================================

    await ShowtimeConfigRepository.deleteByMovieAndCinema(
        movieId,
        cinemaId
    );

    // =====================================================
    // 4. INSERT CONFIG MỚI
    // =====================================================

    let insertedCount = 0;

    for (const config of validConfigs) {

        await ShowtimeConfigRepository.create({
            movie_id: movieId,
            cinema_id: cinemaId,
            day_type: config.day_type,
            time_slot: config.time_slot,
            room_type: config.room_type,
            slot_count: config.slot_count,
            interval_minutes: config.interval_minutes,
            is_active: 1
        });

        insertedCount++;
    }

    // =====================================================
    // 5. TRẢ VỀ THÔNG TIN DEBUG
    // =====================================================

    return {
        inserted: insertedCount,

        configs: validConfigs.map(config => ({
            time_slot: config.time_slot,
            room_type: config.room_type,
            slot_count: config.slot_count,
            interval_minutes: config.interval_minutes,
            day_type: config.day_type,
            is_active: 1
        }))
    };
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
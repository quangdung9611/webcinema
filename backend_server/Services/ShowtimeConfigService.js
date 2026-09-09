// ============================================================
// services/ShowtimeConfigService.js
// ============================================================

const ShowtimeConfigRepository = require('../Repositories/ShowtimeConfigRepository');

class ShowtimeConfigService {

    // ========================================================
    // CONSTANTS
    // ========================================================

    ALLOWED_TIME_SLOTS = [
        'MORNING',
        'AFTERNOON',
        'EVENING',
        'NIGHT'
    ];

    ALLOWED_ROOM_TYPES = [
        '2D',
        '3D',
        'VIP',
        'IMAX'
    ];

    ALLOWED_DAY_TYPES = [
        'ALL',
        'WEEKDAY',
        'WEEKEND'
    ];

    /*=========================================================
        HELPER - TẠO ERROR
    =========================================================*/
    createError(message, statusCode = 400, field = 'general') {
        const err = new Error(message);

        err.statusCode = statusCode;
        err.field = field;

        return err;
    }

    /*=========================================================
        HELPER - NORMALIZE CONFIG
    =========================================================*/
    normalizeConfig(config) {
        return {
            config_id:
                config.config_id !== undefined &&
                config.config_id !== null &&
                config.config_id !== ''
                    ? Number(config.config_id)
                    : null,

            time_slot: String(
                config.time_slot || ''
            )
                .trim()
                .toUpperCase(),

            room_type: String(
                config.room_type || ''
            )
                .trim()
                .toUpperCase(),

            slot_count: Number(config.slot_count),

            interval_minutes: Number(
                config.interval_minutes
            ),

            day_type: String(
                config.day_type || 'ALL'
            )
                .trim()
                .toUpperCase(),

            is_active:
                Number(config.is_active) === 1
                    ? 1
                    : 0
        };
    }

    /*=========================================================
        HELPER - VALIDATE CONFIG
    =========================================================*/
    validateConfig(config) {

        if (
            !this.ALLOWED_TIME_SLOTS.includes(
                config.time_slot
            )
        ) {
            return false;
        }

        if (
            !this.ALLOWED_ROOM_TYPES.includes(
                config.room_type
            )
        ) {
            return false;
        }

        if (
            !this.ALLOWED_DAY_TYPES.includes(
                config.day_type
            )
        ) {
            return false;
        }

        if (
            !Number.isFinite(config.slot_count) ||
            config.slot_count <= 0
        ) {
            return false;
        }

        if (
            !Number.isFinite(config.interval_minutes) ||
            config.interval_minutes <= 0
        ) {
            return false;
        }

        return true;
    }

    /*=========================================================
        LẤY CẤU HÌNH CỦA 1 PHIM Ở 1 RẠP
    =========================================================*/
    async getConfig(movieId, cinemaId) {

        if (!movieId || !cinemaId) {
            throw this.createError(
                'Thiếu movie_id hoặc cinema_id',
                400,
                'general'
            );
        }

        const configs =
            await ShowtimeConfigRepository
                .findByMovieAndCinema(
                    movieId,
                    cinemaId
                );

        return configs;
    }

    /*=========================================================
        LẤY TẤT CẢ CONFIG

        Bao gồm cả inactive.
    =========================================================*/
    async getAllConfig(movieId, cinemaId) {

        if (!movieId || !cinemaId) {
            throw this.createError(
                'Thiếu movie_id hoặc cinema_id',
                400,
                'general'
            );
        }

        return await ShowtimeConfigRepository
            .findAllByMovieAndCinema(
                movieId,
                cinemaId
            );
    }

    /*=========================================================
        SAVE CONFIG

        LOGIC:

        1. Config có config_id
           → UPDATE đúng config_id.

        2. Config không có config_id
           → kiểm tra bằng:
              movie + cinema + day + slot + room

           Nếu tồn tại:
              → UPDATE

           Nếu chưa tồn tại:
              → INSERT

        3. Config cũ không còn xuất hiện trong payload
           → DELETE.

        4. Không DELETE ALL rồi INSERT ALL.
    =========================================================*/
    async saveConfig(movieId, cinemaId, configs) {

        if (!movieId || !cinemaId) {
            throw this.createError(
                'Thiếu movie_id hoặc cinema_id',
                400,
                'general'
            );
        }

        if (!Array.isArray(configs)) {
            throw this.createError(
                'Configs phải là mảng',
                400,
                'configs'
            );
        }

        // ====================================================
        // NORMALIZE
        // ====================================================

        const normalizedConfigs =
            configs.map(config =>
                this.normalizeConfig(config)
            );

        // ====================================================
        // KIỂM TRA CONFIG TRÙNG TRONG PAYLOAD
        // ====================================================

        const uniqueKeys = new Set();

        for (const config of normalizedConfigs) {

            if (!this.validateConfig(config)) {
                throw this.createError(
                    `Cấu hình không hợp lệ: ${JSON.stringify(config)}`,
                    400,
                    'configs'
                );
            }

            const key = [
                config.day_type,
                config.time_slot,
                config.room_type
            ].join('|');

            if (uniqueKeys.has(key)) {
                throw this.createError(
                    `Cấu hình bị trùng: ${config.day_type} - ${config.time_slot} - ${config.room_type}`,
                    400,
                    'configs'
                );
            }

            uniqueKeys.add(key);
        }

        // ====================================================
        // BẮT ĐẦU TRANSACTION
        // ====================================================

        const connection =
            await ShowtimeConfigRepository
                .beginTransaction();

        try {

            // =================================================
            // LẤY CONFIG HIỆN TẠI
            // =================================================

            const existingConfigs =
                await ShowtimeConfigRepository
                    .findAllByMovieAndCinema(
                        movieId,
                        cinemaId
                    );

            const existingMap = new Map();

            for (const existing of existingConfigs) {

                const key = [
                    existing.day_type,
                    existing.time_slot,
                    existing.room_type
                ].join('|');

                existingMap.set(key, existing);
            }

            // =================================================
            // THEO DÕI CONFIG ĐƯỢC GIỮ LẠI
            // =================================================

            const keptConfigIds = new Set();

            let inserted = 0;
            let updated = 0;
            let deleted = 0;

            // =================================================
            // XỬ LÝ CONFIG GỬI LÊN
            // =================================================

            for (const config of normalizedConfigs) {

                let existing = null;

                // ---------------------------------------------
                // TRƯỜNG HỢP 1:
                // Frontend gửi config_id
                // ---------------------------------------------

                if (config.config_id) {

                    existing =
                        existingConfigs.find(
                            item =>
                                Number(item.config_id) ===
                                Number(config.config_id)
                        );

                    if (!existing) {
                        throw this.createError(
                            `Không tìm thấy config_id ${config.config_id}`,
                            404,
                            'config_id'
                        );
                    }

                    // Bảo vệ không cho config_id
                    // trỏ sang movie/cinema khác
                    if (
                        Number(existing.movie_id) !==
                            Number(movieId) ||
                        Number(existing.cinema_id) !==
                            Number(cinemaId)
                    ) {
                        throw this.createError(
                            'Config không thuộc phim hoặc rạp hiện tại',
                            400,
                            'config_id'
                        );
                    }
                }

                // ---------------------------------------------
                // TRƯỜNG HỢP 2:
                // Không có config_id
                //
                // Tìm bằng khóa logic
                // ---------------------------------------------

                if (!existing) {

                    const key = [
                        config.day_type,
                        config.time_slot,
                        config.room_type
                    ].join('|');

                    existing = existingMap.get(key) || null;
                }

                // ---------------------------------------------
                // CÓ CONFIG → UPDATE
                // ---------------------------------------------

                if (existing) {

                    await ShowtimeConfigRepository.update(
                        existing.config_id,
                        {
                            day_type:
                                config.day_type,

                            time_slot:
                                config.time_slot,

                            room_type:
                                config.room_type,

                            slot_count:
                                config.slot_count,

                            interval_minutes:
                                config.interval_minutes,

                            is_active: 1
                        },
                        connection
                    );

                    keptConfigIds.add(
                        Number(existing.config_id)
                    );

                    updated++;

                    continue;
                }

                // ---------------------------------------------
                // CHƯA CÓ → INSERT
                // ---------------------------------------------

                const newConfigId =
                    await ShowtimeConfigRepository.create(
                        {
                            movie_id: movieId,
                            cinema_id: cinemaId,
                            day_type:
                                config.day_type,
                            time_slot:
                                config.time_slot,
                            room_type:
                                config.room_type,
                            slot_count:
                                config.slot_count,
                            interval_minutes:
                                config.interval_minutes,
                            is_active: 1
                        },
                        connection
                    );

                keptConfigIds.add(
                    Number(newConfigId)
                );

                inserted++;
            }

            // =================================================
            // XÓA CONFIG CŨ KHÔNG CÒN TRONG PAYLOAD
            // =================================================

            for (const existing of existingConfigs) {

                const existingId =
                    Number(existing.config_id);

                if (
                    !keptConfigIds.has(existingId)
                ) {

                    await ShowtimeConfigRepository
                        .deleteById(
                            existingId,
                            connection
                        );

                    deleted++;
                }
            }

            // =================================================
            // COMMIT
            // =================================================

            await ShowtimeConfigRepository
                .commit(connection);

            // =================================================
            // RETURN
            // =================================================

            return {
                success: true,

                inserted,

                updated,

                deleted,

                total:
                    inserted +
                    updated,

                message:
                    'Lưu cấu hình suất chiếu thành công'
            };

        } catch (error) {

            // =================================================
            // ROLLBACK
            // =================================================

            await ShowtimeConfigRepository
                .rollback(connection);

            throw error;
        }
    }

    /*=========================================================
        XÓA 1 CẤU HÌNH
    =========================================================*/
    async deleteConfig(configId) {

        if (!configId) {
            throw this.createError(
                'Thiếu config_id',
                400,
                'config_id'
            );
        }

        const existing =
            await ShowtimeConfigRepository
                .findById(configId);

        if (!existing) {
            throw this.createError(
                'Không tìm thấy cấu hình',
                404,
                'config_id'
            );
        }

        const affectedRows =
            await ShowtimeConfigRepository
                .deleteById(configId);

        if (affectedRows === 0) {
            throw this.createError(
                'Xóa cấu hình thất bại',
                500,
                'general'
            );
        }

        return {
            success: true,
            config_id: Number(configId),
            message: 'Xóa cấu hình thành công'
        };
    }

    /*=========================================================
        CẬP NHẬT 1 CONFIG THEO ID
    =========================================================*/
    async updateConfig(configId, data) {

        if (!configId) {
            throw this.createError(
                'Thiếu config_id',
                400,
                'config_id'
            );
        }

        const existing =
            await ShowtimeConfigRepository
                .findById(configId);

        if (!existing) {
            throw this.createError(
                'Không tìm thấy cấu hình',
                404,
                'config_id'
            );
        }

        // ====================================================
        // NORMALIZE DATA
        // ====================================================

        const normalized = {
            day_type:
                data.day_type !== undefined
                    ? String(data.day_type)
                        .trim()
                        .toUpperCase()
                    : existing.day_type,

            time_slot:
                data.time_slot !== undefined
                    ? String(data.time_slot)
                        .trim()
                        .toUpperCase()
                    : existing.time_slot,

            room_type:
                data.room_type !== undefined
                    ? String(data.room_type)
                        .trim()
                        .toUpperCase()
                    : existing.room_type,

            slot_count:
                data.slot_count !== undefined
                    ? Number(data.slot_count)
                    : Number(existing.slot_count),

            interval_minutes:
                data.interval_minutes !== undefined
                    ? Number(data.interval_minutes)
                    : Number(existing.interval_minutes),

            is_active:
                data.is_active !== undefined
                    ? Number(data.is_active) === 1
                        ? 1
                        : 0
                    : Number(existing.is_active)
        };

        // ====================================================
        // VALIDATE
        // ====================================================

        if (
            !this.ALLOWED_TIME_SLOTS.includes(
                normalized.time_slot
            )
        ) {
            throw this.createError(
                'Time slot không hợp lệ',
                400,
                'time_slot'
            );
        }

        if (
            !this.ALLOWED_ROOM_TYPES.includes(
                normalized.room_type
            )
        ) {
            throw this.createError(
                'Room type không hợp lệ',
                400,
                'room_type'
            );
        }

        if (
            !this.ALLOWED_DAY_TYPES.includes(
                normalized.day_type
            )
        ) {
            throw this.createError(
                'Day type không hợp lệ',
                400,
                'day_type'
            );
        }

        if (
            !Number.isFinite(
                normalized.slot_count
            ) ||
            normalized.slot_count <= 0
        ) {
            throw this.createError(
                'Số suất phải lớn hơn 0',
                400,
                'slot_count'
            );
        }

        if (
            !Number.isFinite(
                normalized.interval_minutes
            ) ||
            normalized.interval_minutes <= 0
        ) {
            throw this.createError(
                'Khoảng cách phải lớn hơn 0',
                400,
                'interval_minutes'
            );
        }

        // ====================================================
        // KIỂM TRA TRÙNG
        // ====================================================

        const duplicate =
            await ShowtimeConfigRepository.exists(
                existing.movie_id,
                existing.cinema_id,
                normalized.time_slot,
                normalized.room_type,
                normalized.day_type
            );

        if (
            duplicate &&
            Number(duplicate.config_id) !==
                Number(configId)
        ) {
            throw this.createError(
                'Đã tồn tại cấu hình cùng phim, rạp, ngày, khung giờ và loại phòng',
                409,
                'config'
            );
        }

        // ====================================================
        // UPDATE
        // ====================================================

        const affectedRows =
            await ShowtimeConfigRepository.update(
                configId,
                normalized
            );

        if (affectedRows === 0) {
            throw this.createError(
                'Cập nhật cấu hình thất bại',
                500,
                'general'
            );
        }

        return {
            success: true,

            config_id:
                Number(configId),

            updated: 1,

            message:
                'Cập nhật cấu hình thành công'
        };
    }
}

module.exports = new ShowtimeConfigService();
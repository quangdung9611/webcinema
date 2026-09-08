// controllers/ShowtimeConfigController.js

const ShowtimeConfigService = require('../Services/ShowtimeConfigService');

/*=========================================================
    ADMIN - LẤY CẤU HÌNH LỊCH CHIẾU CỦA PHIM
=========================================================*/
exports.getShowtimeConfig = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { cinema_id } = req.query;

        if (!movie_id || !cinema_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu movie_id hoặc cinema_id'
            });
        }

        const data = await ShowtimeConfigService.getConfig(movie_id, cinema_id);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error('Get Showtime Config Error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi server'
        });
    }
};

/*=========================================================
    ADMIN - LƯU CẤU HÌNH LỊCH CHIẾU CHO PHIM
=========================================================*/
exports.saveShowtimeConfig = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { cinema_id, configs } = req.body;

        if (!movie_id || !cinema_id) {
            return res.status(400).json({
                success: false,
                field: 'general',
                message: 'Thiếu movie_id hoặc cinema_id'
            });
        }

        if (!Array.isArray(configs) || configs.length === 0) {
            return res.status(400).json({
                success: false,
                field: 'configs',
                message: 'Configs phải là mảng và không được rỗng'
            });
        }

        const result = await ShowtimeConfigService.saveConfig(movie_id, cinema_id, configs);

        return res.status(200).json({
            success: true,
            message: `Lưu thành công ${result.inserted} cấu hình`,
            data: result
        });
    } catch (err) {
        console.error('Save Showtime Config Error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || 'Lỗi server'
        });
    }
};

/*=========================================================
    ADMIN - XÓA CẤU HÌNH LỊCH CHIẾU
=========================================================*/
exports.deleteShowtimeConfig = async (req, res) => {
    try {
        const { movie_id, config_id } = req.params;

        if (!movie_id || !config_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu movie_id hoặc config_id'
            });
        }

        await ShowtimeConfigService.deleteConfig(config_id);

        return res.status(200).json({
            success: true,
            message: 'Xóa cấu hình thành công'
        });
    } catch (err) {
        console.error('Delete Showtime Config Error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || 'Lỗi server'
        });
    }
};

/*=========================================================
    ADMIN - CẬP NHẬT CẤU HÌNH LỊCH CHIẾU
=========================================================*/
exports.updateShowtimeConfig = async (req, res) => {
    try {
        const { movie_id, config_id } = req.params;
        const data = req.body;

        if (!movie_id || !config_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu movie_id hoặc config_id'
            });
        }

        await ShowtimeConfigService.updateConfig(config_id, data);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật cấu hình thành công'
        });
    } catch (err) {
        console.error('Update Showtime Config Error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || 'Lỗi server'
        });
    }
};
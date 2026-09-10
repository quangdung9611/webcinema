// ============================================================
// controllers/ShowtimeConfigController.js
// ============================================================

const ShowtimeConfigService = require('../Services/ShowtimeConfigService');

/*=========================================================
    ADMIN - LẤY CẤU HÌNH LỊCH CHIẾU CỦA PHIM
=========================================================*/
exports.getShowtimeConfig = async (req, res) => {
    try {

        const { movie_id } = req.params;
        const { cinema_id } = req.query;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!movie_id || !cinema_id) {
            return res.status(400).json({
                success: false,
                field: 'general',
                message: 'Thiếu movie_id hoặc cinema_id'
            });
        }

        // =====================================================
        // GET CONFIG
        // =====================================================

        const data =
            await ShowtimeConfigService.getConfig(
                movie_id,
                cinema_id
            );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({
            success: true,
            data
        });

    } catch (err) {

        console.error(
            'Get Showtime Config Error:',
            err
        );

        return res.status(
            err.statusCode || 500
        ).json({
            success: false,
            field: err.field || null,
            message:
                err.message ||
                'Lỗi server'
        });
    }
};


/*=========================================================
    ADMIN - LƯU CẤU HÌNH LỊCH CHIẾU CHO PHIM

    LOGIC:

    CONFIG CŨ
        → UPDATE

    CONFIG MỚI
        → INSERT

    CONFIG BỊ BỎ KHỎI PAYLOAD
        → DELETE

    Mỗi config = 1 giờ cụ thể (start_time)
=========================================================*/
exports.saveShowtimeConfig = async (req, res) => {
    try {

        const { movie_id } = req.params;

        const {
            cinema_id,
            configs
        } = req.body;

        // =====================================================
        // VALIDATE MOVIE + CINEMA
        // =====================================================

        if (!movie_id || !cinema_id) {
            return res.status(400).json({
                success: false,
                field: 'general',
                message:
                    'Thiếu movie_id hoặc cinema_id'
            });
        }

        // =====================================================
        // VALIDATE CONFIGS
        //
        // Cho phép [] để có thể xóa toàn bộ config
        // nếu frontend thực sự gửi mảng rỗng.
        // =====================================================

        if (!Array.isArray(configs)) {
            return res.status(400).json({
                success: false,
                field: 'configs',
                message:
                    'Configs phải là mảng'
            });
        }

        // =====================================================
        // SAVE
        // =====================================================

        const result =
            await ShowtimeConfigService.saveConfig(
                movie_id,
                cinema_id,
                configs
            );

        // =====================================================
        // RESPONSE MESSAGE
        // =====================================================

        const inserted =
            Number(result.inserted || 0);

        const updated =
            Number(result.updated || 0);

        const deleted =
            Number(result.deleted || 0);

        return res.status(200).json({

            success: true,

            message:
                `Lưu cấu hình thành công ` +
                `(thêm ${inserted}, ` +
                `cập nhật ${updated}, ` +
                `xóa ${deleted})`,

            data: result
        });

    } catch (err) {

        console.error(
            'Save Showtime Config Error:',
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            field: err.field || null,
            message:
                err.message ||
                'Lỗi server'
        });
    }
};


/*=========================================================
    ADMIN - XÓA 1 CẤU HÌNH LỊCH CHIẾU
=========================================================*/
exports.deleteShowtimeConfig = async (req, res) => {
    try {

        const {
            movie_id,
            config_id
        } = req.params;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!movie_id || !config_id) {
            return res.status(400).json({
                success: false,
                field: 'general',
                message:
                    'Thiếu movie_id hoặc config_id'
            });
        }

        // =====================================================
        // DELETE
        // =====================================================

        const result =
            await ShowtimeConfigService.deleteConfig(
                config_id
            );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({
            success: true,
            message:
                'Xóa cấu hình thành công',
            data: result
        });

    } catch (err) {

        console.error(
            'Delete Showtime Config Error:',
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            field: err.field || null,
            message:
                err.message ||
                'Lỗi server'
        });
    }
};


/*=========================================================
    ADMIN - CẬP NHẬT 1 CẤU HÌNH LỊCH CHIẾU
=========================================================*/
exports.updateShowtimeConfig = async (req, res) => {
    try {

        const {
            movie_id,
            config_id
        } = req.params;

        const data = req.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!movie_id || !config_id) {
            return res.status(400).json({
                success: false,
                field: 'general',
                message:
                    'Thiếu movie_id hoặc config_id'
            });
        }

        // =====================================================
        // UPDATE
        // =====================================================

        const result =
            await ShowtimeConfigService.updateConfig(
                config_id,
                data
            );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({
            success: true,
            message:
                'Cập nhật cấu hình thành công',
            data: result
        });

    } catch (err) {

        console.error(
            'Update Showtime Config Error:',
            err
        );

        return res.status(
            err.statusCode || 400
        ).json({
            success: false,
            field: err.field || null,
            message:
                err.message ||
                'Lỗi server'
        });
    }
};
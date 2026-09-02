const PriceConfigService = require("../Services/PriceConfigService");

class PriceConfigController {
    // ==========================================================
    // LẤY TẤT CẢ (ADMIN)
    // ==========================================================

    async getAll(req, res) {
        try {
            const data = await PriceConfigService.getAll();
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy danh sách cấu hình giá thành công"
            });
        } catch (err) {
            console.error("❌ getAll error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // LẤY TẤT CẢ ACTIVE (PUBLIC)
    // ==========================================================

    async getAllActive(req, res) {
        try {
            const data = await PriceConfigService.getAllActive();
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy danh sách cấu hình giá đang hoạt động thành công"
            });
        } catch (err) {
            console.error("❌ getAllActive error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // LẤY THEO ID
    // ==========================================================

    async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await PriceConfigService.getById(id);
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy cấu hình giá thành công"
            });
        } catch (err) {
            console.error("❌ getById error:", err);
            return res.status(err.statusCode || 404).json({
                success: false,
                message: err.message || "Không tìm thấy"
            });
        }
    }

    // ==========================================================
    // LẤY THEO ROOM_TYPE
    // ==========================================================

    async getByRoomType(req, res) {
        try {
            const { roomType } = req.params;
            const data = await PriceConfigService.getByRoomType(roomType);
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy cấu hình giá theo loại phòng thành công"
            });
        } catch (err) {
            console.error("❌ getByRoomType error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // LẤY DANH SÁCH ROOM_TYPE
    // ==========================================================

    async getDistinctRoomTypes(req, res) {
        try {
            const data = await PriceConfigService.getDistinctRoomTypes();
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy danh sách loại phòng thành công"
            });
        } catch (err) {
            console.error("❌ getDistinctRoomTypes error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // LẤY DANH SÁCH SEAT_TYPE
    // ==========================================================

    async getDistinctSeatTypes(req, res) {
        try {
            const data = await PriceConfigService.getDistinctSeatTypes();
            return res.status(200).json({
                success: true,
                data,
                message: "Lấy danh sách loại ghế thành công"
            });
        } catch (err) {
            console.error("❌ getDistinctSeatTypes error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // LẤY GIÁ VÉ (PUBLIC)
    // ==========================================================

    async getPrice(req, res) {
        try {
            const { roomType, startTime, date, seatType } = req.query;
            const price = await PriceConfigService.getPrice(
                roomType,
                startTime,
                date,
                seatType || 'STANDARD'
            );
            return res.status(200).json({
                success: true,
                data: { price },
                message: "Lấy giá vé thành công"
            });
        } catch (err) {
            console.error("❌ getPrice error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi máy chủ"
            });
        }
    }

    // ==========================================================
    // TẠO MỚI (ADMIN)
    // ==========================================================

    async create(req, res) {
        try {
            const data = await PriceConfigService.create(req.body);
            return res.status(201).json({
                success: true,
                data,
                message: "Tạo cấu hình giá thành công"
            });
        } catch (err) {
            console.error("❌ create error:", err);
            return res.status(err.statusCode || 400).json({
                success: false,
                message: err.message || "Lỗi tạo cấu hình giá"
            });
        }
    }

    // ==========================================================
    // CẬP NHẬT (ADMIN)
    // ==========================================================

    async update(req, res) {
        try {
            const { id } = req.params;
            const data = await PriceConfigService.update(id, req.body);
            return res.status(200).json({
                success: true,
                data,
                message: "Cập nhật cấu hình giá thành công"
            });
        } catch (err) {
            console.error("❌ update error:", err);
            return res.status(err.statusCode || 400).json({
                success: false,
                message: err.message || "Lỗi cập nhật cấu hình giá"
            });
        }
    }

    // ==========================================================
    // CẬP NHẬT STATUS (ADMIN)
    // ==========================================================

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            await PriceConfigService.updateStatus(id, status);
            return res.status(200).json({
                success: true,
                message: `Đã ${status === 1 ? 'kích hoạt' : 'vô hiệu hóa'} cấu hình giá`
            });
        } catch (err) {
            console.error("❌ updateStatus error:", err);
            return res.status(err.statusCode || 400).json({
                success: false,
                message: err.message || "Lỗi cập nhật trạng thái"
            });
        }
    }

    // ==========================================================
    // XÓA (ADMIN)
    // ==========================================================

    async delete(req, res) {
        try {
            const { id } = req.params;
            await PriceConfigService.delete(id);
            return res.status(200).json({
                success: true,
                message: "Xóa cấu hình giá thành công"
            });
        } catch (err) {
            console.error("❌ delete error:", err);
            return res.status(err.statusCode || 400).json({
                success: false,
                message: err.message || "Lỗi xóa cấu hình giá"
            });
        }
    }

    // ==========================================================
    // SEED DỮ LIỆU (ADMIN)
    // ==========================================================

    async seed(req, res) {
        try {
            const result = await PriceConfigService.seedDefaultPrices();
            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (err) {
            console.error("❌ seed error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Lỗi seed dữ liệu"
            });
        }
    }
}

module.exports = new PriceConfigController();
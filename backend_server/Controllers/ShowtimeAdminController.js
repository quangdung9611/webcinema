// Controllers/ShowtimeAdminController.js

const ShowtimeService = require("../Services/ShowtimeService");

class ShowtimeAdminController {

    async checkBookings(req, res) {
        try {
            const showtimeId = Number(req.params.id);
            if (!showtimeId) {
                return res.status(400).json({ success: false, message: "ID suất chiếu không hợp lệ" });
            }
            const result = await ShowtimeService.checkBookings(showtimeId);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("❌ [ADMIN] checkBookings error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Không thể kiểm tra suất chiếu"
            });
        }
    }

    async cancelShowtime(req, res) {
        try {
            const showtimeId = Number(req.params.id);
            const { reason } = req.body;
            const adminId = req.admin?.admin_id || req.user?.user_id || null;

            if (!showtimeId) {
                return res.status(400).json({ success: false, message: "ID suất chiếu không hợp lệ" });
            }
            if (!reason || !String(reason).trim()) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập lý do hủy" });
            }

            const result = await ShowtimeService.cancelShowtime(
                showtimeId,
                String(reason).trim(),
                adminId
            );

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (err) {
            console.error("❌ [ADMIN] cancelShowtime error:", err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Không thể hủy suất chiếu"
            });
        }
    }
}

module.exports = new ShowtimeAdminController();
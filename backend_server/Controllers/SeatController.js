// Controllers/SeatController.js
const SeatService = require("../Services/SeatService");
const PriceConfigService = require("../Services/PriceConfigService"); // 👈 IMPORT
const db = require("../Config/db");


// ==========================================================
// PUBLIC - LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
// ==========================================================

exports.getSeatMapByShowtime = async (req, res) => {
    try {
        const { showtimeId } = req.params;
        const data = await SeatService.getSeatMapByShowtime(showtimeId);

        // data đã có price từ SeatService (đã lấy từ price_config)

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("❌ getSeatMapByShowtime error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


// ==========================================================
// ADMIN - LẤY DANH SÁCH GHẾ THEO PHÒNG
// ==========================================================

exports.getSeatsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const data = await SeatService.getSeatsByRoom(roomId);

        // Lấy thông tin phòng để biết room_type
        const [roomInfo] = await db.query(
            `SELECT room_type FROM rooms WHERE room_id = ?`,
            [roomId]
        );

        let priceMap = {};
        if (roomInfo.length > 0) {
            const roomType = roomInfo[0].room_type;
            const timeSlots = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
            const dayTypes = ['WEEKDAY', 'WEEKEND'];
            const seatTypes = ['STANDARD', 'VIP', 'DELUXE', 'RECLINER', 'COUPLE'];

            // Lấy giá từ price_config cho tất cả tổ hợp
            for (const timeSlot of timeSlots) {
                for (const dayType of dayTypes) {
                    for (const seatType of seatTypes) {
                        const key = `${timeSlot}_${dayType}_${seatType}`;
                        try {
                            const price = await PriceConfigService.getPrice(
                                roomType,
                                timeSlot === 'MORNING' ? '09:00:00' : 
                                timeSlot === 'AFTERNOON' ? '14:00:00' :
                                timeSlot === 'EVENING' ? '19:00:00' : '22:00:00',
                                new Date().toISOString().split('T')[0],
                                seatType
                            );
                            priceMap[key] = price;
                        } catch (error) {
                            priceMap[key] = 0;
                        }
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            data,
            price_config: priceMap
        });
    } catch (err) {
        console.error("❌ getSeatsByRoom error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


// ==========================================================
// ADMIN - KHỞI TẠO GHẾ CHO PHÒNG
// ==========================================================

exports.initRoomSeats = async (req, res) => {
    try {
        const { roomId, roomType, cinemaId } = req.body;

        const result = await SeatService.initRoomSeats(
            roomId,
            roomType,
            cinemaId
        );

        return res.status(200).json({
            success: true,
            message: `Khởi tạo xong phòng ${roomType} chuẩn cấu hình!`,
            data: result
        });
    } catch (err) {
        console.error("❌ initRoomSeats error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


// ==========================================================
// ADMIN - XÓA SẠCH GHẾ TRONG PHÒNG
// ==========================================================

exports.deleteSeatsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        await SeatService.deleteSeatsByRoom(roomId);
        return res.status(200).json({
            success: true,
            message: "Đã xóa sạch cấu trúc phòng!"
        });
    } catch (err) {
        console.error("❌ deleteSeatsByRoom error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


// ==========================================================
// ADMIN - BẬT / TẮT BẢO TRÌ GHẾ
// ==========================================================

exports.toggleSeatActive = async (req, res) => {
    try {
        const { seatId, isActive } = req.body;

        const affected = await SeatService.toggleSeatActive(
            seatId,
            isActive
        );

        return res.status(200).json({
            success: true,
            message: Number(isActive) === 0
                ? "Đã khóa bảo trì ghế thành công!"
                : "Đã mở hoạt động ghế thành công!",
            affectedRows: affected
        });
    } catch (err) {
        console.error("❌ toggleSeatActive error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


// ==========================================================
// ADMIN - CẬP NHẬT LOẠI GHẾ + GIÁ
// ==========================================================

exports.updateSeatTypeAndPrice = async (req, res) => {
    try {
        const { seatId, seatType, price } = req.body;

        await SeatService.updateSeatTypeAndPrice(
            seatId,
            seatType,
            price
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật loại ghế/giá thành công!"
        });
    } catch (err) {
        console.error("❌ updateSeatTypeAndPrice error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
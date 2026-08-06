const SeatService = require("../Services/SeatService");

// ==========================================================
// PUBLIC - Lấy sơ đồ ghế theo suất chiếu
// ==========================================================
exports.getSeatMapByShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const data = await SeatService.getSeatMapByShowtime(showtimeId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("getSeatMapByShowtime error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ==========================================================
// ADMIN - Lấy danh sách ghế theo phòng
// ✅ TRẢ VỀ { success: true, data: [...] }
// ==========================================================
exports.getSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const data = await SeatService.getSeatsByRoom(roomId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("getSeatsByRoom error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ==========================================================
// ADMIN - Khởi tạo ghế cho phòng
// ==========================================================
exports.initRoomSeats = async (req, res) => {
  try {
    const { roomId, roomType, cinemaId } = req.body;
    const result = await SeatService.initRoomSeats(roomId, roomType, cinemaId);
    return res.status(200).json({
      success: true,
      message: `Khởi tạo xong phòng ${roomType} chuẩn cấu hình!`,
      data: result,
    });
  } catch (err) {
    console.error("initRoomSeats error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ==========================================================
// ADMIN - Xóa sạch ghế trong phòng
// ==========================================================
exports.deleteSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    await SeatService.deleteSeatsByRoom(roomId);
    return res.status(200).json({
      success: true,
      message: "Đã xóa sạch cấu trúc phòng!",
    });
  } catch (err) {
    console.error("deleteSeatsByRoom error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ==========================================================
// ADMIN - Bật/tắt bảo trì ghế
// ==========================================================
exports.toggleSeatActive = async (req, res) => {
  try {
    const { seatId, isActive } = req.body;
    await SeatService.toggleSeatActive(seatId, isActive);
    return res.status(200).json({
      success: true,
      message: "Đã cập nhật trạng thái bảo trì!",
    });
  } catch (err) {
    console.error("toggleSeatActive error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ==========================================================
// ADMIN - Cập nhật loại ghế và giá
// ==========================================================
exports.updateSeatTypeAndPrice = async (req, res) => {
  try {
    const { seatId, seatType, price } = req.body;
    await SeatService.updateSeatTypeAndPrice(seatId, seatType, price);
    return res.status(200).json({
      success: true,
      message: "Cập nhật loại ghế/giá thành công!",
    });
  } catch (err) {
    console.error("updateSeatTypeAndPrice error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
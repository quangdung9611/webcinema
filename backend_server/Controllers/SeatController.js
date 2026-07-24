const SeatService = require("../Services/SeatService");

// PUBLIC
exports.getSeatMapByShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const data = await SeatService.getSeatMapByShowtime(showtimeId);
    return res.status(200).json(data);
  } catch (err) {
    console.error("getSeatMapByShowtime error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

// ADMIN
exports.getSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const data = await SeatService.getSeatsByRoom(roomId);
    return res.status(200).json(data);
  } catch (err) {
    console.error("getSeatsByRoom error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

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
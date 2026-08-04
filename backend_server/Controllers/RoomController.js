const RoomService = require("../Services/RoomService");

exports.getAllRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data = await RoomService.getAllRooms(page, limit, search);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get all rooms error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { room_id } = req.params;
    const data = await RoomService.getRoomById(room_id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get room by id error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.getRoomsByCinema = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const data = await RoomService.getRoomsByCinema(cinema_id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get rooms by cinema error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const roomId = await RoomService.createRoom(req.body);
    return res.status(201).json({
      success: true,
      message: "Thêm phòng thành công",
      data: { room_id: roomId },
    });
  } catch (err) {
    console.error("Create room error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      field: err.field || null,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    await RoomService.updateRoom(room_id, req.body);
    return res.status(200).json({
      success: true,
      message: "Cập nhật phòng thành công",
    });
  } catch (err) {
    console.error("Update room error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      field: err.field || null,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    await RoomService.deleteRoom(room_id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa phòng thành công",
    });
  } catch (err) {
    console.error("Delete room error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
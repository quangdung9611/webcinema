const RoomRepository = require("../Repositories/RoomRepository");

const validateRoom = (data) => {
  const { room_name, cinema_id, room_type } = data;

  if (!room_name || !cinema_id || !room_type) {
    return "Vui lòng nhập tên phòng, chọn cụm rạp và loại phòng";
  }

  if (room_name.trim().length < 2) {
    return "Tên phòng quá ngắn";
  }

  const validRoomTypes = ["2D", "3D", "IMAX"];
  if (!validRoomTypes.includes(room_type)) {
    return "Loại phòng không hợp lệ";
  }

  return null;
};

class RoomService {
  async getAllRooms() {
    return await RoomRepository.findAll();
  }

  async getRoomById(id) {
    const room = await RoomRepository.findById(id);
    if (!room) {
      const err = new Error("Không tìm thấy phòng");
      err.statusCode = 404;
      throw err;
    }
    return room;
  }

  async getRoomsByCinema(cinemaId) {
    return await RoomRepository.findByCinema(cinemaId);
  }

  async createRoom(data) {
    const { room_name, cinema_id, room_type } = data;

    const error = validateRoom(data);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      err.field = this.getField(error);
      throw err;
    }

    const name = room_name.trim();

    // Check duplicate
    const dup = await RoomRepository.findByNameInCinema(name, cinema_id);
    if (dup) {
      const err = new Error("Tên phòng này đã tồn tại trong rạp này rồi");
      err.statusCode = 400;
      err.field = "room_name";
      throw err;
    }

    return await RoomRepository.create({ room_name: name, cinema_id, room_type });
  }

  async updateRoom(id, data) {
    const { room_name, cinema_id, room_type } = data;

    const existing = await RoomRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy phòng");
      err.statusCode = 404;
      throw err;
    }

    const error = validateRoom(data);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      err.field = this.getField(error);
      throw err;
    }

    const name = room_name.trim();

    // Check duplicate (exclude current)
    const dup = await RoomRepository.findByNameInCinema(name, cinema_id, id);
    if (dup) {
      const err = new Error("Tên phòng này đã tồn tại trong rạp này rồi");
      err.statusCode = 400;
      err.field = "room_name";
      throw err;
    }

    const affected = await RoomRepository.update(id, { room_name: name, cinema_id, room_type });
    if (affected === 0) {
      const err = new Error("Không thể cập nhật phòng");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }

  async deleteRoom(id) {
    const existing = await RoomRepository.findById(id);
    if (!existing) {
      const err = new Error("Không tìm thấy phòng");
      err.statusCode = 404;
      throw err;
    }

    try {
      const affected = await RoomRepository.delete(id);
      if (affected === 0) {
        const err = new Error("Xóa phòng thất bại");
        err.statusCode = 400;
        throw err;
      }
      return true;
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        const e = new Error("Không thể xóa vì phòng đã có dữ liệu ghế hoặc suất chiếu");
        e.statusCode = 400;
        throw e;
      }
      throw err;
    }
  }

  getField(errorMsg) {
    if (errorMsg.includes("tên phòng")) return "room_name";
    if (errorMsg.includes("loại phòng")) return "room_type";
    if (errorMsg.includes("rạp")) return "cinema_id";
    return null;
  }
}

module.exports = new RoomService();
const RoomRepository = require("../Repositories/RoomRepository");

// ==========================================================
// VALIDATE
// ==========================================================
const validateRoom = (data) => {
    const { room_name, cinema_id, room_type } = data;

    if (!room_name || !cinema_id || !room_type) {
        return { field: null, message: "Vui lòng nhập tên phòng, chọn cụm rạp và loại phòng" };
    }

    if (room_name.trim().length < 2) {
        return { field: "room_name", message: "Tên phòng quá ngắn (tối thiểu 2 ký tự)" };
    }

    // ✅ Đồng bộ với CSDL (enum trong bảng rooms) - ĐÃ XÓA 4DMAX
    const validRoomTypes = ["2D", "3D", "IMAX", "VIP"];  // 👈 Đã xóa 4DMAX
    if (!validRoomTypes.includes(room_type)) {
        return { field: "room_type", message: "Loại phòng không hợp lệ. Chấp nhận: 2D, 3D, IMAX, VIP" };
    }

    return null;
};

// ==========================================================
// SERVICE
// ==========================================================
class RoomService {

    // ----- GET ALL (không phân trang) -----
    async getAllRoomsAll(search = "") {
        return await RoomRepository.findAllAll(search);
    }

    // ----- GET ALL (có phân trang) -----
    async getAllRoomsPaginated(page = 1, limit = 20, search = "") {
        return await RoomRepository.findAll(page, limit, search);
    }

    // ----- GET BY ID -----
    async getRoomById(roomId) {
        const room = await RoomRepository.findById(roomId);
        if (!room) {
            const err = new Error("Không tìm thấy phòng");
            err.statusCode = 404;
            err.field = null;
            throw err;
        }
        return room;
    }

    // ----- GET BY CINEMA -----
    async getRoomsByCinema(cinemaId) {
        return await RoomRepository.findByCinema(cinemaId);
    }

    // ----- CREATE -----
    async createRoom(data) {
        const { room_name, cinema_id, room_type } = data;

        // Validate
        const validation = validateRoom(data);
        if (validation) {
            const err = new Error(validation.message);
            err.statusCode = 400;
            err.field = validation.field;
            throw err;
        }

        const name = room_name.trim();

        // Kiểm tra trùng tên phòng trong cùng rạp
        const dup = await RoomRepository.findByNameInCinema(name, cinema_id);
        if (dup) {
            const err = new Error("Tên phòng này đã tồn tại trong rạp này");
            err.statusCode = 400;
            err.field = "room_name";
            throw err;
        }

        // Tạo mới
        const newId = await RoomRepository.create({
            room_name: name,
            cinema_id,
            room_type
        });

        return newId;
    }

    // ----- UPDATE -----
    async updateRoom(roomId, data) {
        const { room_name, cinema_id, room_type } = data;

        // Kiểm tra tồn tại
        const existing = await RoomRepository.findById(roomId);
        if (!existing) {
            const err = new Error("Không tìm thấy phòng");
            err.statusCode = 404;
            err.field = null;
            throw err;
        }

        // Validate
        const validation = validateRoom(data);
        if (validation) {
            const err = new Error(validation.message);
            err.statusCode = 400;
            err.field = validation.field;
            throw err;
        }

        const name = room_name.trim();

        // Kiểm tra trùng tên phòng (trừ chính nó)
        const dup = await RoomRepository.findByNameInCinema(name, cinema_id, roomId);
        if (dup) {
            const err = new Error("Tên phòng này đã tồn tại trong rạp này");
            err.statusCode = 400;
            err.field = "room_name";
            throw err;
        }

        // Cập nhật
        const affected = await RoomRepository.update(roomId, {
            room_name: name,
            cinema_id,
            room_type
        });

        if (affected === 0) {
            const err = new Error("Không thể cập nhật phòng");
            err.statusCode = 500;
            err.field = null;
            throw err;
        }

        return true;
    }

    // ----- DELETE -----
    async deleteRoom(roomId) {
        const existing = await RoomRepository.findById(roomId);
        if (!existing) {
            const err = new Error("Không tìm thấy phòng");
            err.statusCode = 404;
            err.field = null;
            throw err;
        }

        try {
            const affected = await RoomRepository.delete(roomId);
            if (affected === 0) {
                const err = new Error("Xóa phòng thất bại");
                err.statusCode = 400;
                err.field = null;
                throw err;
            }
            return true;
        } catch (err) {
            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                const e = new Error("Không thể xóa vì phòng đã có dữ liệu ghế hoặc suất chiếu");
                e.statusCode = 400;
                e.field = null;
                throw e;
            }
            throw err;
        }
    }
}

module.exports = new RoomService();
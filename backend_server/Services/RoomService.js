const RoomRepository = require("../Repositories/RoomRepository");
const SeatService = require("./SeatService");

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

    const validRoomTypes = ["2D", "3D", "IMAX", "VIP"];
    if (!validRoomTypes.includes(room_type)) {
        return { field: "room_type", message: "Loại phòng không hợp lệ. Chấp nhận: 2D, 3D, IMAX, VIP" };
    }

    return null;
};

// ==========================================================
// SERVICE
// ==========================================================
class RoomService {

    async getAllRoomsAll(search = "") {
        return await RoomRepository.findAllAll(search);
    }

    async getAllRoomsPaginated(page = 1, limit = 20, search = "") {
        return await RoomRepository.findAll(page, limit, search);
    }

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

    async getRoomsByCinema(cinemaId) {
        return await RoomRepository.findByCinema(cinemaId);
    }

    // ==========================================================
    // CREATE - 1 PHÒNG (TỰ ĐỘNG TẠO GHẾ)
    // ==========================================================
    async createRoom(data) {
        const { room_name, cinema_id, room_type } = data;

        const validation = validateRoom(data);
        if (validation) {
            const err = new Error(validation.message);
            err.statusCode = 400;
            err.field = validation.field;
            throw err;
        }

        const name = room_name.trim();

        const dup = await RoomRepository.findByNameInCinema(name, cinema_id);
        if (dup) {
            const err = new Error("Tên phòng này đã tồn tại trong rạp này");
            err.statusCode = 400;
            err.field = "room_name";
            throw err;
        }

        const newRoomId = await RoomRepository.create({
            room_name: name,
            cinema_id,
            room_type
        });

        try {
            const seatResult = await SeatService.initRoomSeats(newRoomId, room_type, cinema_id);
            console.log(`✅ Tạo phòng ${name} (${room_type}) thành công với ${seatResult.totalSeats} ghế`);
            console.log(`📊 Phân bố ghế:`, seatResult.seatTypes);
        } catch (seatErr) {
            console.warn(`⚠️ Tạo phòng thành công nhưng tạo ghế thất bại: ${seatErr.message}`);
        }

        return newRoomId;
    }

    // ==========================================================
    // CREATE BULK - TẠO NHIỀU PHÒNG HÀNG LOẠT (LINH HOẠT)
    // ==========================================================
    async createRoomsBulk(data) {
        const { cinema_id, room_types } = data;

        if (!cinema_id) {
            const err = new Error("Vui lòng chọn rạp");
            err.statusCode = 400;
            err.field = "cinema_id";
            throw err;
        }

        if (!room_types || !Array.isArray(room_types) || room_types.length === 0) {
            const err = new Error("Vui lòng chọn ít nhất một loại phòng");
            err.statusCode = 400;
            err.field = "room_types";
            throw err;
        }

        const results = {
            success: [],
            failed: [],
            total: 0,
            created: 0,
            errors: []
        };

        for (const item of room_types) {
            const roomType = item.type;
            const count = Number(item.count) || 1;

            const validRoomTypes = ["2D", "3D", "IMAX", "VIP"];
            if (!validRoomTypes.includes(roomType)) {
                results.errors.push(`Loại phòng không hợp lệ: ${roomType}`);
                continue;
            }

            // Đếm số phòng hiện có để tự động đặt tên (tránh trùng)
            const existingRooms = await RoomRepository.countByType(cinema_id, roomType);
            let startNumber = existingRooms + 1;

            for (let i = 0; i < count; i++) {
                const roomName = `Phòng ${roomType} ${String(startNumber).padStart(2, '0')}`;
                startNumber++;
                results.total++;

                try {
                    const dup = await RoomRepository.findByNameInCinema(roomName, cinema_id);
                    if (dup) {
                        results.failed.push({
                            room_name: roomName,
                            room_type: roomType,
                            error: "Tên phòng đã tồn tại"
                        });
                        continue;
                    }

                    const newRoomId = await RoomRepository.create({
                        room_name: roomName,
                        cinema_id,
                        room_type: roomType
                    });

                    const seatResult = await SeatService.initRoomSeats(newRoomId, roomType, cinema_id);

                    results.created++;
                    results.success.push({
                        room_id: newRoomId,
                        room_name: roomName,
                        room_type: roomType,
                        total_seats: seatResult.totalSeats
                    });

                    console.log(`✅ ${roomName} (${roomType}) → ${seatResult.totalSeats} ghế`);

                } catch (err) {
                    results.failed.push({
                        room_name: roomName,
                        room_type: roomType,
                        error: err.message || "Lỗi không xác định"
                    });
                    results.errors.push(err.message);
                    console.error(`❌ ${roomName} (${roomType}) → ${err.message}`);
                }
            }
        }

        return results;
    }

    // ==========================================================
    // UPDATE
    // ==========================================================
    async updateRoom(roomId, data) {
        const { room_name, cinema_id, room_type } = data;

        const existing = await RoomRepository.findById(roomId);
        if (!existing) {
            const err = new Error("Không tìm thấy phòng");
            err.statusCode = 404;
            err.field = null;
            throw err;
        }

        const validation = validateRoom(data);
        if (validation) {
            const err = new Error(validation.message);
            err.statusCode = 400;
            err.field = validation.field;
            throw err;
        }

        const name = room_name.trim();

        const dup = await RoomRepository.findByNameInCinema(name, cinema_id, roomId);
        if (dup) {
            const err = new Error("Tên phòng này đã tồn tại trong rạp này");
            err.statusCode = 400;
            err.field = "room_name";
            throw err;
        }

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

    // ==========================================================
    // DELETE
    // ==========================================================
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
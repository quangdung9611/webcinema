const RoomService = require("../Services/RoomService");

/*=========================================================
    PUBLIC/ADMIN - GET ALL ROOMS (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllRoomsAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        // Không cho phép page / limit trên API không phân trang
        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/rooms không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/rooms/paginated để phân trang."
            });
        }

        // Service trả về trực tiếp rows[]
        const data = await RoomService.getAllRoomsAll(search);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get All Rooms Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET ROOMS WITH PAGINATION
=========================================================*/
exports.getRoomsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const result = await RoomService.getAllRoomsPaginated(page, limit, search);

        // Service trả: { data: [], pagination: {} }
        // Controller KHÔNG bọc result vào data nữa
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("Get Rooms Paginated Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET ROOM BY ID
=========================================================*/
exports.getRoomById = async (req, res) => {
    try {
        const { room_id } = req.params;
        const data = await RoomService.getRoomById(room_id);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get room by id error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    PUBLIC - GET ROOMS BY CINEMA
=========================================================*/
exports.getRoomsByCinema = async (req, res) => {
    try {
        const { cinema_id } = req.params;
        const data = await RoomService.getRoomsByCinema(cinema_id);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get rooms by cinema error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - CREATE ROOM
=========================================================*/
exports.createRoom = async (req, res) => {
    try {
        const roomId = await RoomService.createRoom(req.body);
        return res.status(201).json({
            success: true,
            message: "Thêm phòng thành công",
            data: { room_id: roomId }
        });
    } catch (err) {
        console.error("Create room error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE ROOM
=========================================================*/
exports.updateRoom = async (req, res) => {
    try {
        const { room_id } = req.params;
        await RoomService.updateRoom(room_id, req.body);
        return res.status(200).json({
            success: true,
            message: "Cập nhật phòng thành công"
        });
    } catch (err) {
        console.error("Update room error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - DELETE ROOM
=========================================================*/
exports.deleteRoom = async (req, res) => {
    try {
        const { room_id } = req.params;
        await RoomService.deleteRoom(room_id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa phòng thành công"
        });
    } catch (err) {
        console.error("Delete room error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
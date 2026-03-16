const express = require('express');
const router = express.Router();
const roomController = require('../Controllers/RoomController');

// Lấy toàn bộ danh sách phòng (cho trang RoomList)
router.get('/', roomController.getAllRooms);

// Lấy chi tiết 1 phòng (cho trang RoomUpdate)
router.get('/:id', roomController.getRoomById);

// Lọc phòng theo rạp (Dùng cho dropdown khi thêm ghế)
router.get('/cinema/:cinema_id', roomController.getRoomsByCinema);

// Thêm phòng
router.post('/add', roomController.createRoom);

// Cập nhật phòng
router.put('/update/:id', roomController.updateRoom);

// Xóa phòng
router.delete('/delete/:id', roomController.deleteRoom);

module.exports = router;
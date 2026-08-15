const SeatRepository = require("../Repositories/SeatRepository");

// ==========================================================
// CẤU HÌNH CHO TỪNG LOẠI PHÒNG
// ==========================================================
const ROOM_CONFIG = {
  '2D': {
    totalSeats: 120,        // 12 hàng x 10 ghế
    seatsPerRow: 10,
    defaultPrice: 80000,
    vipPrice: 0,            // không có VIP
    couplePrice: 150000,
    coupleRow: 'last',      // hàng cuối là ghế đôi
    vipRows: [],            // không có hàng VIP
  },
  '3D': {
    totalSeats: 80,         // 8 hàng x 10 ghế
    seatsPerRow: 10,
    defaultPrice: 120000,
    vipPrice: 150000,
    couplePrice: 200000,
    coupleRow: 'last',
    vipRows: [2, 3, 4, 5],  // hàng số 3,4,5,6 (index từ 0)
  },
  '4DMAX': {
    totalSeats: 64,         // 8 hàng x 8 ghế
    seatsPerRow: 8,
    defaultPrice: 180000,
    vipPrice: 0,
    couplePrice: 250000,
    coupleRow: 'last',
    vipRows: [],
  },
  'IMAX': {
    totalSeats: 48,         // 6 hàng x 8 ghế
    seatsPerRow: 8,
    defaultPrice: 250000,
    vipPrice: 0,
    couplePrice: 350000,
    coupleRow: 'last',
    vipRows: [],
  },
  'VIP': {
    totalSeats: 36,         // 6 hàng x 6 ghế, tất cả VIP
    seatsPerRow: 6,
    defaultPrice: 250000,
    vipPrice: 250000,       // tất cả đều VIP
    couplePrice: 350000,
    coupleRow: 'last',
    vipRows: [0,1,2,3,4,5], // tất cả hàng
  }
};

class SeatService {

  // ==========================================================
  // Lấy sơ đồ ghế theo suất chiếu (public)
  // ==========================================================
  async getSeatMapByShowtime(showtimeId) {
    const roomInfo = await SeatRepository.getRoomInfo(showtimeId);
    if (!roomInfo) {
      const err = new Error("Không tìm thấy suất chiếu");
      err.statusCode = 404;
      throw err;
    }
    const roomId = roomInfo.room_id;
    const seats = await SeatRepository.findSeatsByShowtime(showtimeId, roomId);
    return seats;
  }

  // ==========================================================
  // Lấy danh sách ghế theo phòng (admin)
  // ==========================================================
  async getSeatsByRoom(roomId) {
    const seats = await SeatRepository.findSeatsByRoom(roomId);
    console.log(`✅ [SeatService] getSeatsByRoom: ${seats.length} ghế cho room ${roomId}`);
    return seats;
  }

  // ==========================================================
  // KHỞI TẠO GHẾ CHO PHÒNG (theo cấu hình)
  // ==========================================================
  async initRoomSeats(roomId, roomType, cinemaId) {
    // Lấy cấu hình cho loại phòng
    const config = ROOM_CONFIG[roomType];
    if (!config) {
      const err = new Error(`Loại phòng "${roomType}" không được hỗ trợ`);
      err.statusCode = 400;
      throw err;
    }

    const { totalSeats, seatsPerRow, defaultPrice, vipPrice, couplePrice, coupleRow, vipRows } = config;

    // Xóa ghế cũ trong phòng
    await SeatRepository.deleteAllByRoom(roomId);

    // Chuẩn bị dữ liệu insert
    const seatsData = [];
    const totalRows = Math.ceil(totalSeats / seatsPerRow);

    for (let i = 0; i < totalSeats; i++) {
      const rowIndex = Math.floor(i / seatsPerRow);
      const rowLetter = String.fromCharCode(65 + rowIndex);
      const seatNumber = (i % seatsPerRow) + 1;

      let seatType = 'Standard';
      let price = defaultPrice;

      // Xác định loại ghế dựa trên vị trí và cấu hình
      const isLastRow = (rowIndex === totalRows - 1);
      const isVipRow = vipRows.includes(rowIndex);

      // Xử lý ghế Couple: chỉ ở hàng cuối và số ghế chẵn (1-2, 3-4, ...)
      if (isLastRow && coupleRow === 'last' && seatNumber % 2 === 0) {
        seatType = 'Couple';
        price = couplePrice;
      } 
      // Xử lý VIP
      else if (isVipRow && vipPrice > 0) {
        seatType = 'VIP';
        price = vipPrice;
      }
      // Mặc định Standard
      else {
        seatType = 'Standard';
        price = defaultPrice;
      }

      // Đối với loại VIP (phòng VIP): tất cả ghế đều là VIP
      if (roomType === 'VIP') {
        seatType = 'VIP';
        price = vipPrice;
      }

      seatsData.push([
        roomId,
        cinemaId,
        rowLetter,
        seatNumber,
        seatType,
        price,
        1 // is_active
      ]);
    }

    // Insert hàng loạt
    if (seatsData.length) {
      await SeatRepository.bulkInsert(seatsData);
    }

    // Cập nhật tổng số ghế trong bảng rooms
    await SeatRepository.updateRoomTotalSeats(roomId, totalSeats);

    return { totalSeats: seatsData.length };
  }

  // ==========================================================
  // Xóa sạch ghế trong phòng
  // ==========================================================
  async deleteSeatsByRoom(roomId) {
    try {
      const affected = await SeatRepository.deleteAllByRoom(roomId);
      if (affected === 0) {
        const err = new Error("Không tìm thấy ghế để xóa hoặc phòng trống");
        err.statusCode = 404;
        throw err;
      }
      return affected;
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        const e = new Error("Không thể xóa vì phòng này đã có dữ liệu vé đặt!");
        e.statusCode = 400;
        throw e;
      }
      throw err;
    }
  }

  // ==========================================================
  // Bật/tắt bảo trì ghế
  // ==========================================================
  async toggleSeatActive(seatId, isActive) {
    const affected = await SeatRepository.updateActiveStatus(seatId, isActive);
    if (affected === 0) {
      const err = new Error("Không tìm thấy ghế");
      err.statusCode = 404;
      throw err;
    }
    return affected;
  }

  // ==========================================================
  // Cập nhật loại ghế và giá
  // ==========================================================
  async updateSeatTypeAndPrice(seatId, seatType, price) {
    const affected = await SeatRepository.updateTypeAndPrice(seatId, seatType, price);
    if (affected === 0) {
      const err = new Error("Không tìm thấy ghế");
      err.statusCode = 404;
      throw err;
    }
    return affected;
  }
}

module.exports = new SeatService();
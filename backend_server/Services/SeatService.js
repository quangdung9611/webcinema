const SeatRepository = require("../Repositories/SeatRepository");

// ==========================================================
// CẤU HÌNH GHẾ THEO TỪNG LOẠI PHÒNG
// ==========================================================
//
// 5 LOẠI GHẾ:
//
// STANDARD  → Ghế đơn thường
// VIP       → Ghế đơn VIP
// DELUXE    → Ghế đơn cao cấp
// RECLINER  → Ghế đơn hạng sang
// COUPLE    → Ghế đôi
//
// QUY TẮC:
// - Chỉ COUPLE là ghế đôi.
// - STANDARD / VIP / DELUXE / RECLINER đều là ghế đơn.
// - COUPLE vẫn lưu 2 seat record vật lý.
// - IMAX và VIP KHÔNG CÓ STANDARD.
// ==========================================================

const ROOM_CONFIG = {

  // ========================================================
  // 2D
  // ========================================================
  // 120 ghế = 12 hàng x 10 ghế
  //
  // A-G : STANDARD
  // H-J : VIP
  // K   : DELUXE
  // L   : COUPLE
  // ========================================================

  "2D": {
    totalSeats: 120,
    seatsPerRow: 10,

    standardPrice: 80000,
    vipPrice: 100000,
    deluxePrice: 130000,
    reclinerPrice: 180000,
    couplePrice: 200000,

    standardRows: [0, 1, 2, 3, 4, 5, 6],
    vipRows: [7, 8, 9],
    deluxeRows: [10],
    reclinerRows: [],

    coupleRow: 11
  },


  // ========================================================
  // 3D
  // ========================================================
  // 80 ghế = 8 hàng x 10 ghế
  //
  // A-B : STANDARD
  // C-D : VIP
  // E-F : DELUXE
  // G   : RECLINER
  // H   : COUPLE
  // ========================================================

  "3D": {
    totalSeats: 80,
    seatsPerRow: 10,

    standardPrice: 120000,
    vipPrice: 140000,
    deluxePrice: 160000,
    reclinerPrice: 220000,
    couplePrice: 260000,

    standardRows: [0, 1],
    vipRows: [2, 3],
    deluxeRows: [4, 5],
    reclinerRows: [6],

    coupleRow: 7
  },


  // ========================================================
  // 4DMAX
  // ========================================================
  // 64 ghế = 8 hàng x 8 ghế
  //
  // A-B : STANDARD
  // C-D : VIP
  // E-F : DELUXE
  // G   : RECLINER
  // H   : COUPLE
  // ========================================================

  "4DMAX": {
    totalSeats: 64,
    seatsPerRow: 8,

    standardPrice: 180000,
    vipPrice: 200000,
    deluxePrice: 230000,
    reclinerPrice: 280000,
    couplePrice: 340000,

    standardRows: [0, 1],
    vipRows: [2, 3],
    deluxeRows: [4, 5],
    reclinerRows: [6],

    coupleRow: 7
  },


  // ========================================================
  // IMAX
  // ========================================================
  // 48 ghế = 6 hàng x 8 ghế
  //
  // KHÔNG CÓ STANDARD
  //
  // A-B : VIP
  // C-D : DELUXE
  // E   : RECLINER
  // F   : COUPLE
  // ========================================================

  "IMAX": {
    totalSeats: 48,
    seatsPerRow: 8,

    standardPrice: 0,
    vipPrice: 270000,
    deluxePrice: 300000,
    reclinerPrice: 350000,
    couplePrice: 450000,

    standardRows: [],
    vipRows: [0, 1],
    deluxeRows: [2, 3],
    reclinerRows: [4],

    coupleRow: 5
  },


  // ========================================================
  // VIP
  // ========================================================
  // 36 ghế = 6 hàng x 6 ghế
  //
  // KHÔNG CÓ STANDARD
  //
  // A-B : VIP
  // C-D : DELUXE
  // E   : RECLINER
  // F   : COUPLE
  // ========================================================

  "VIP": {
    totalSeats: 36,
    seatsPerRow: 6,

    standardPrice: 0,
    vipPrice: 270000,
    deluxePrice: 300000,
    reclinerPrice: 350000,
    couplePrice: 450000,

    standardRows: [],
    vipRows: [0, 1],
    deluxeRows: [2, 3],
    reclinerRows: [4],

    coupleRow: 5
  }
};


// ==========================================================
// SEAT SERVICE
// ==========================================================

class SeatService {

  // ==========================================================
  // LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
  // ==========================================================

  async getSeatMapByShowtime(showtimeId) {

    const roomInfo =
      await SeatRepository.getRoomInfo(showtimeId);

    if (!roomInfo) {

      const err =
        new Error("Không tìm thấy suất chiếu");

      err.statusCode = 404;

      throw err;
    }

    const roomId = roomInfo.room_id;

    const seats =
      await SeatRepository.findSeatsByShowtime(
        showtimeId,
        roomId
      );

    return seats;
  }


  // ==========================================================
  // LẤY DANH SÁCH GHẾ THEO PHÒNG - ADMIN
  // ==========================================================

  async getSeatsByRoom(roomId) {

    const seats =
      await SeatRepository.findSeatsByRoom(roomId);

    console.log(
      `✅ [SeatService] getSeatsByRoom: ${seats.length} ghế cho room ${roomId}`
    );

    return seats;
  }


  // ==========================================================
  // KHỞI TẠO GHẾ CHO PHÒNG
  // ==========================================================

  async initRoomSeats(roomId, roomType, cinemaId) {

    // ========================================================
    // LẤY CẤU HÌNH
    // ========================================================

    const config = ROOM_CONFIG[roomType];

    if (!config) {

      const err =
        new Error(
          `Loại phòng "${roomType}" không được hỗ trợ`
        );

      err.statusCode = 400;

      throw err;
    }


    const {
      totalSeats,
      seatsPerRow,

      standardPrice,
      vipPrice,
      deluxePrice,
      reclinerPrice,
      couplePrice,

      standardRows,
      vipRows,
      deluxeRows,
      reclinerRows,

      coupleRow

    } = config;


    // ========================================================
    // XÓA GHẾ CŨ TRONG PHÒNG
    // ========================================================

    await SeatRepository.deleteAllByRoom(roomId);


    // ========================================================
    // CHUẨN BỊ DỮ LIỆU
    // ========================================================

    const seatsData = [];

    const totalRows =
      Math.ceil(totalSeats / seatsPerRow);


    // ========================================================
    // TẠO GHẾ
    // ========================================================

    for (let i = 0; i < totalSeats; i++) {

      // ------------------------------------------------------
      // Xác định hàng
      // ------------------------------------------------------

      const rowIndex =
        Math.floor(i / seatsPerRow);

      const rowLetter =
        String.fromCharCode(65 + rowIndex);


      // ------------------------------------------------------
      // Xác định số ghế
      // ------------------------------------------------------

      const seatNumber =
        (i % seatsPerRow) + 1;


      // ------------------------------------------------------
      // Mặc định
      // ------------------------------------------------------

      let seatType = "STANDARD";
      let price = standardPrice;


      // ======================================================
      // COUPLE
      // ======================================================
      //
      // Chỉ hàng coupleRow mới là COUPLE.
      //
      // Ví dụ:
      //
      // Hàng F:
      //
      // F1 F2 → cặp 1
      // F3 F4 → cặp 2
      // F5 F6 → cặp 3
      //
      // Database vẫn lưu từng seat riêng.
      //
      // ======================================================

      if (rowIndex === coupleRow) {

        seatType = "COUPLE";
        price = couplePrice;
      }


      // ======================================================
      // RECLINER
      // ======================================================

      else if (
        reclinerRows.includes(rowIndex)
      ) {

        seatType = "RECLINER";
        price = reclinerPrice;
      }


      // ======================================================
      // DELUXE
      // ======================================================

      else if (
        deluxeRows.includes(rowIndex)
      ) {

        seatType = "DELUXE";
        price = deluxePrice;
      }


      // ======================================================
      // VIP
      // ======================================================

      else if (
        vipRows.includes(rowIndex)
      ) {

        seatType = "VIP";
        price = vipPrice;
      }


      // ======================================================
      // STANDARD
      // ======================================================

      else if (
        standardRows.includes(rowIndex)
      ) {

        seatType = "STANDARD";
        price = standardPrice;
      }


      // ======================================================
      // FALLBACK
      // ======================================================

      else {

        seatType = "STANDARD";
        price = standardPrice;
      }


      // ======================================================
      // THÊM GHẾ
      // ======================================================

      seatsData.push([
        roomId,
        cinemaId,
        rowLetter,
        seatNumber,
        seatType,
        price,
        1
      ]);
    }


    // ========================================================
    // INSERT HÀNG LOẠT
    // ========================================================

    if (seatsData.length > 0) {

      await SeatRepository.bulkInsert(
        seatsData
      );
    }


    // ========================================================
    // CẬP NHẬT TỔNG GHẾ CỦA PHÒNG
    // ========================================================

    await SeatRepository.updateRoomTotalSeats(
      roomId,
      totalSeats
    );


    // ========================================================
    // THỐNG KÊ GHẾ
    // ========================================================

    const summary =
      seatsData.reduce(
        (result, seat) => {

          const type = seat[4];

          if (!result[type]) {
            result[type] = 0;
          }

          result[type]++;

          return result;

        },
        {}
      );


    console.log(
      `✅ [SeatService] Đã tạo ${seatsData.length} ghế cho room ${roomId}`
    );

    console.log(
      "📊 Phân bố ghế:",
      summary
    );


    // ========================================================
    // KẾT QUẢ
    // ========================================================

    return {
      totalSeats: seatsData.length,
      seatTypes: summary
    };
  }


  // ==========================================================
  // XÓA SẠCH GHẾ TRONG PHÒNG
  // ==========================================================

  async deleteSeatsByRoom(roomId) {

    try {

      const affected =
        await SeatRepository.deleteAllByRoom(
          roomId
        );


      if (affected === 0) {

        const err =
          new Error(
            "Không tìm thấy ghế để xóa hoặc phòng trống"
          );

        err.statusCode = 404;

        throw err;
      }


      return affected;

    } catch (err) {

      if (
        err.code === "ER_ROW_IS_REFERENCED_2"
      ) {

        const e =
          new Error(
            "Không thể xóa vì phòng này đã có dữ liệu vé đặt!"
          );

        e.statusCode = 400;

        throw e;
      }

      throw err;
    }
  }


  // ==========================================================
  // BẬT / TẮT BẢO TRÌ GHẾ
  // ==========================================================

  async toggleSeatActive(
    seatId,
    isActive
  ) {

    const affected =
      await SeatRepository.updateActiveStatus(
        seatId,
        isActive
      );


    if (affected === 0) {

      const err =
        new Error(
          "Không tìm thấy ghế"
        );

      err.statusCode = 404;

      throw err;
    }


    return affected;
  }


  // ==========================================================
  // CẬP NHẬT LOẠI GHẾ + GIÁ
  // ==========================================================

  async updateSeatTypeAndPrice(
    seatId,
    seatType,
    price
  ) {

    // ========================================================
    // CHUẨN HÓA LOẠI GHẾ
    // ========================================================

    const normalizedType =
      seatType?.toUpperCase();


    // ========================================================
    // LOẠI GHẾ HỢP LỆ
    // ========================================================

    const allowedTypes = [
      "STANDARD",
      "VIP",
      "DELUXE",
      "RECLINER",
      "COUPLE"
    ];


    if (
      !allowedTypes.includes(
        normalizedType
      )
    ) {

      const err =
        new Error(
          `Loại ghế "${seatType}" không hợp lệ`
        );

      err.statusCode = 400;

      throw err;
    }


    // ========================================================
    // KIỂM TRA GIÁ
    // ========================================================

    const normalizedPrice =
      Number(price);


    if (
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0
    ) {

      const err =
        new Error(
          "Giá ghế không hợp lệ"
        );

      err.statusCode = 400;

      throw err;
    }


    // ========================================================
    // UPDATE
    // ========================================================

    const affected =
      await SeatRepository.updateTypeAndPrice(
        seatId,
        normalizedType,
        normalizedPrice
      );


    if (affected === 0) {

      const err =
        new Error(
          "Không tìm thấy ghế"
        );

      err.statusCode = 404;

      throw err;
    }


    return affected;
  }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = new SeatService();
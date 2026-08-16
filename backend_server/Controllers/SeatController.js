const SeatService = require("../Services/SeatService");


// ==========================================================
// PUBLIC
// LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
// ==========================================================

exports.getSeatMapByShowtime = async (
  req,
  res
) => {

  try {

    const {
      showtimeId
    } = req.params;


    const data =
      await SeatService.getSeatMapByShowtime(
        showtimeId
      );


    return res.status(200).json({

      success: true,

      data

    });

  } catch (err) {

    console.error(
      "❌ getSeatMapByShowtime error:",
      err
    );


    return res
      .status(
        err.statusCode || 500
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};


// ==========================================================
// ADMIN
// LẤY DANH SÁCH GHẾ THEO PHÒNG
// ==========================================================

exports.getSeatsByRoom = async (
  req,
  res
) => {

  try {

    const {
      roomId
    } = req.params;


    const data =
      await SeatService.getSeatsByRoom(
        roomId
      );


    return res.status(200).json({

      success: true,

      data

    });

  } catch (err) {

    console.error(
      "❌ getSeatsByRoom error:",
      err
    );


    return res
      .status(
        err.statusCode || 500
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};


// ==========================================================
// ADMIN
// KHỞI TẠO GHẾ CHO PHÒNG
// ==========================================================

exports.initRoomSeats = async (
  req,
  res
) => {

  try {

    const {
      roomId,
      roomType,
      cinemaId
    } = req.body;


    const result =
      await SeatService.initRoomSeats(
        roomId,
        roomType,
        cinemaId
      );


    return res.status(200).json({

      success: true,

      message:
        `Khởi tạo xong phòng ${roomType} chuẩn cấu hình!`,

      data:
        result

    });

  } catch (err) {

    console.error(
      "❌ initRoomSeats error:",
      err
    );


    return res
      .status(
        err.statusCode || 400
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};


// ==========================================================
// ADMIN
// XÓA SẠCH GHẾ TRONG PHÒNG
// ==========================================================

exports.deleteSeatsByRoom = async (
  req,
  res
) => {

  try {

    const {
      roomId
    } = req.params;


    await SeatService.deleteSeatsByRoom(
      roomId
    );


    return res.status(200).json({

      success: true,

      message:
        "Đã xóa sạch cấu trúc phòng!"

    });

  } catch (err) {

    console.error(
      "❌ deleteSeatsByRoom error:",
      err
    );


    return res
      .status(
        err.statusCode || 500
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};


// ==========================================================
// ADMIN
// BẬT / TẮT BẢO TRÌ GHẾ
//
// FRONTEND GỬI:
//
// {
//   seatId: 123,
//   isActive: 0
// }
//
// HOẶC:
//
// {
//   seatId: 123,
//   isActive: 1
// }
//
// BACKEND:
//
// Ghế đơn
// → update 1 ghế.
//
// COUPLE
// → update cả 2 ghế.
//
// Ví dụ:
//
// L1-2
//
// → L1 + L2
// ==========================================================

exports.toggleSeatActive = async (
  req,
  res
) => {

  try {

    const {
      seatId,
      isActive
    } = req.body;


    const affected =
      await SeatService.toggleSeatActive(
        seatId,
        isActive
      );


    return res.status(200).json({

      success: true,

      message:
        Number(isActive) === 0
          ? "Đã khóa bảo trì ghế thành công!"
          : "Đã mở hoạt động ghế thành công!",

      affectedRows:
        affected

    });

  } catch (err) {

    console.error(
      "❌ toggleSeatActive error:",
      err
    );


    return res
      .status(
        err.statusCode || 500
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};


// ==========================================================
// ADMIN
// CẬP NHẬT LOẠI GHẾ + GIÁ
// ==========================================================

exports.updateSeatTypeAndPrice = async (
  req,
  res
) => {

  try {

    const {
      seatId,
      seatType,
      price
    } = req.body;


    await SeatService.updateSeatTypeAndPrice(
      seatId,
      seatType,
      price
    );


    return res.status(200).json({

      success: true,

      message:
        "Cập nhật loại ghế/giá thành công!"

    });

  } catch (err) {

    console.error(
      "❌ updateSeatTypeAndPrice error:",
      err
    );


    return res
      .status(
        err.statusCode || 500
      )
      .json({

        success: false,

        message:
          err.message ||
          "Lỗi máy chủ"

      });
  }
};
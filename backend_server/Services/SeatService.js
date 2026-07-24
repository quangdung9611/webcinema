const SeatRepository = require("../Repositories/SeatRepository");

class SeatService {
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

  async getSeatsByRoom(roomId) {
    const seats = await SeatRepository.findSeatsByRoom(roomId);
    if (!seats.length) {
      const err = new Error("Không tìm thấy ghế cho phòng này");
      err.statusCode = 404;
      throw err;
    }
    return seats;
  }

  async initRoomSeats(roomId, roomType, cinemaId) {
    let totalSeats = 0;
    const seatsPerRow = 10;
    const seatsData = [];

    switch (roomType) {
      case "2D": totalSeats = 120; break;
      case "3D": totalSeats = 80; break;
      case "IMAX": totalSeats = 48; break;
      default: totalSeats = 60;
    }

    // Xóa ghế cũ
    await SeatRepository.deleteAllByRoom(roomId);

    const totalRows = Math.ceil(totalSeats / seatsPerRow);

    for (let i = 0; i < totalSeats; i++) {
      const rowIndex = Math.floor(i / seatsPerRow);
      const rowLetter = String.fromCharCode(65 + rowIndex);
      const seatNumber = (i % seatsPerRow) + 1;

      let type = "Standard";
      let price = 0;

      if (roomType === "2D") {
        type = (rowIndex === totalRows - 1) ? "Couple" : "Standard";
      } else if (roomType === "IMAX") {
        type = (rowIndex === totalRows - 1) ? "Couple" : "VIP";
      } else if (roomType === "3D") {
        if (rowIndex === totalRows - 1) type = "Couple";
        else if (rowIndex >= 2 && rowIndex <= 5) type = "VIP";
        else type = "Standard";
      }

      if (roomType === "IMAX") {
        price = (type === "Couple") ? 350000 : 250000;
      } else if (roomType === "3D") {
        if (type === "VIP") price = 150000;
        else if (type === "Couple") price = 200000;
        else price = 120000;
      } else {
        price = (type === "Couple") ? 150000 : 80000;
      }

      // Chỉ thêm ghế Couple nếu số ghế lẻ và không vượt quá max
      if (type === "Couple") {
        const maxCoupleSeats = (roomType === "IMAX") ? 8 : 10;
        if (seatNumber <= maxCoupleSeats && seatNumber % 2 !== 0) {
          seatsData.push([roomId, cinemaId, rowLetter, seatNumber, type, price, 1]);
        }
      } else {
        seatsData.push([roomId, cinemaId, rowLetter, seatNumber, type, price, 1]);
      }
    }

    if (seatsData.length) {
      await SeatRepository.bulkInsert(seatsData);
    }
    await SeatRepository.updateRoomTotalSeats(roomId, totalSeats);
    return { totalSeats: seatsData.length };
  }

  async deleteSeatsByRoom(roomId) {
    // Kiểm tra xem có dữ liệu liên quan không (có thể dùng try catch)
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

  async toggleSeatActive(seatId, isActive) {
    const affected = await SeatRepository.updateActiveStatus(seatId, isActive);
    if (affected === 0) {
      const err = new Error("Không tìm thấy ghế");
      err.statusCode = 404;
      throw err;
    }
    return affected;
  }

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
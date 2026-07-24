const TicketRepository = require("../Repositories/TicketRepository");

class TicketService {
  // ==========================================================
  // LẤY DANH SÁCH VÉ
  // ==========================================================

  async getAllTickets(connection) {
    return await TicketRepository.findAll(connection);
  }

  async getTicketsByBooking(connection, bookingId) {
    return await TicketRepository.findByBookingId(connection, bookingId);
  }

  async getTicketsByShowtime(connection, showtimeId) {
    return await TicketRepository.findByShowtimeId(connection, showtimeId);
  }

  async getTicketByCode(connection, ticketCode) {
    return await TicketRepository.findByCode(connection, ticketCode);
  }

  // ==========================================================
  // SƠ ĐỒ GHẾ
  // ==========================================================

  async getTicketSeatMap(connection, showtimeId) {
    return await TicketRepository.getSeatMapByShowtime(connection, showtimeId);
  }

  // ==========================================================
  // TẠO VÉ (KHI BOOKING ĐƯỢC TẠO)
  // ==========================================================

  async createTickets(connection, bookingId) {
    // 1. Lấy thông tin showtime, room, cinema
    const bookingInfo = await TicketRepository.getBookingInfo(connection, bookingId);
    if (!bookingInfo) {
      throw new Error("Không tìm thấy booking.");
    }

    const { showtime_id, room_id, cinema_id } = bookingInfo;

    // 2. Lấy danh sách ghế từ booking_details
    const seatDetails = await TicketRepository.getSeatDetails(connection, bookingId);
    if (!seatDetails.length) {
      return 0; // Không có ghế thì không tạo vé
    }

    // 3. Tạo dữ liệu vé
    const ticketsData = seatDetails.map(item => [
      bookingId,
      showtime_id,
      room_id,
      cinema_id,
      item.seat_id,
      `WAIT-${bookingId}-${item.seat_id}-${Date.now()}`,
      item.price || 0,
      "Reserved",
      "Valid",
    ]);

    // 4. Insert bulk
    return await TicketRepository.createBulk(connection, ticketsData);
  }

  // ==========================================================
  // CẬP NHẬT TRẠNG THÁI
  // ==========================================================

  async bookTickets(connection, bookingId) {
    // Chuyển trạng thái Reserved -> Booked, đổi mã WAIT -> TIC
    const affected = await TicketRepository.updateToBooked(connection, bookingId);
    return affected;
  }

  async cancelTickets(connection, bookingId) {
    // Chuyển trạng thái thành Cancelled
    const affected = await TicketRepository.updateToCancelled(connection, bookingId);
    return affected;
  }

  async releaseTickets(connection, bookingId) {
    // Giải phóng vé Reserved (khi hủy booking chưa xác nhận)
    const affected = await TicketRepository.releaseReserved(connection, bookingId);
    return affected;
  }

  async markTicketUsed(connection, ticketId) {
    const affected = await TicketRepository.markUsed(connection, ticketId);
    if (!affected) {
      throw new Error("Không tìm thấy vé hoặc vé đã được sử dụng");
    }
    return affected;
  }

  // ==========================================================
  // KIỂM TRA
  // ==========================================================

  async hasReservedTickets(connection, bookingId) {
    return await TicketRepository.hasReservedTickets(connection, bookingId);
  }
}

module.exports = new TicketService();
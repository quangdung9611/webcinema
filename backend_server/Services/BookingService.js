const BookingRepository = require("../Repositories/BookingRepository");
const BookingDetailService = require("./BookingDetailService");
const TicketService = require("./TicketService");

class BookingService {
  async getAllBookings() {
    return await BookingRepository.findAll();
  }

  // Lấy chi tiết booking kèm detail (ghế + đồ ăn)
  async getBookingDetail(connection, bookingId) {
    const booking = await BookingRepository.getDetail(connection, bookingId);
    if (booking) {
      // Lấy tất cả details
      const details = await BookingDetailService.getDetailsWithSeat(connection, bookingId);
      booking.details = details;

      // Tách riêng ghế và đồ ăn (nếu cần)
      booking.seats = details.filter(d => d.seat_id !== null);
      booking.foods = details.filter(d => d.seat_id === null);
    }
    return booking;
  }

  // Chỉ lấy đồ ăn (food)
  async getFoodDetail(connection, bookingId) {
    return await BookingDetailService.getFoodItems(connection, bookingId);
  }

  // Chỉ lấy ghế (tickets)
  async getTickets(connection, bookingId) {
    return await TicketService.getTicketsByBooking(connection, bookingId);
  }

  async findBookingById(connection, bookingId) {
    return await BookingRepository.findById(connection, bookingId);
  }

  async completeBooking(connection, bookingId) {
    await BookingRepository.updateStatus(connection, bookingId, "Completed");
  }

  async cancelBooking(connection, bookingId) {
    await BookingRepository.updateStatus(connection, bookingId, "Cancelled");
  }

  async deleteBooking(id) {
    return await BookingRepository.delete(id);
  }
}

module.exports = new BookingService();
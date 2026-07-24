const BookingDetailRepository = require("../Repositories/BookingDetailRepository");

class BookingDetailService {
  async getDetailsByBooking(connection, bookingId) {
    return await BookingDetailRepository.findByBookingId(connection, bookingId);
  }

  async getDetailsWithSeat(connection, bookingId) {
    return await BookingDetailRepository.findByBookingIdWithSeat(connection, bookingId);
  }

  async getFoodItems(connection, bookingId) {
    return await BookingDetailRepository.findFoodItems(connection, bookingId);
  }

  async getSeatItems(connection, bookingId) {
    return await BookingDetailRepository.findSeatItems(connection, bookingId);
  }

  async addDetail(connection, data) {
    return await BookingDetailRepository.create(connection, data);
  }

  async removeDetail(connection, detailId) {
    return await BookingDetailRepository.deleteById(connection, detailId);
  }

  async clearDetails(connection, bookingId) {
    return await BookingDetailRepository.deleteByBookingId(connection, bookingId);
  }
}

module.exports = new BookingDetailService();
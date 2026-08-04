const BookingRepository = require("../Repositories/BookingRepository");
const BookingDetailService = require("./BookingDetailService");
const TicketService = require("./TicketService");

class BookingService {
    async getAllBookings(page = 1, limit = 20, search = "") {
        return await BookingRepository.findAll(page, limit, search);
    }

    async getBookingDetail(connection, bookingId) {
        const booking = await BookingRepository.getDetail(connection, bookingId);
        if (booking) {
            const details = await BookingDetailService.getDetailsWithSeat(connection, bookingId);
            booking.details = details;
            booking.seats = details.filter(d => d.seat_id !== null);
            booking.foods = details.filter(d => d.seat_id === null);
        }
        return booking;
    }

    async getFoodDetail(connection, bookingId) {
        return await BookingDetailService.getFoodItems(connection, bookingId);
    }

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

    async deleteBooking(bookingId) {
        return await BookingRepository.delete(bookingId);
    }
}

module.exports = new BookingService();
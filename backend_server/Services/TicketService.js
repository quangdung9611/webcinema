const TicketRepository = require("../Repositories/TicketRepository");

class TicketService {

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

    async getTicketSeatMap(connection, showtimeId) {
        return await TicketRepository.getSeatMapByShowtime(connection, showtimeId);
    }

    // Tạo vé (dùng khi tạo booking mới, nếu không dùng PaymentService tự insert thì dùng)
    async createTickets(connection, bookingId) {
        const bookingInfo = await TicketRepository.getBookingInfo(connection, bookingId);
        if (!bookingInfo) throw new Error("Không tìm thấy booking.");

        const { showtime_id, room_id, cinema_id } = bookingInfo;
        const seatDetails = await TicketRepository.getSeatDetails(connection, bookingId);
        if (!seatDetails.length) return 0;

        const ticketsData = seatDetails.map(item => [
            bookingId,
            showtime_id,
            room_id,
            cinema_id,
            item.seat_id,
            `TIC-${bookingId}-${item.seat_id}-${Date.now()}`,
            item.price || 0,
            "Booked",
            "Valid"
        ]);

        return await TicketRepository.createBulk(connection, ticketsData);
    }

    // Check‑in (đánh dấu Used)
    async markTicketUsed(connection, ticketId) {
        const affected = await TicketRepository.markUsed(connection, ticketId);
        if (!affected) throw new Error("Không tìm thấy vé hoặc vé đã được sử dụng");
        return affected;
    }
}

module.exports = new TicketService();
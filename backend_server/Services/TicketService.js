const TicketRepository = require("../Repositories/TicketRepository");
const PriceConfigService = require("./PriceConfigService"); // 👈 IMPORT

class TicketService {

    // ==========================================================
    // LẤY TẤT CẢ VÉ
    // ==========================================================

    async getAllTickets(connection) {
        return await TicketRepository.findAll(connection);
    }

    // ==========================================================
    // LẤY VÉ THEO BOOKING
    // ==========================================================

    async getTicketsByBooking(connection, bookingId) {
        return await TicketRepository.findByBookingId(connection, bookingId);
    }

    // ==========================================================
    // LẤY VÉ THEO SUẤT CHIẾU
    // ==========================================================

    async getTicketsByShowtime(connection, showtimeId) {
        return await TicketRepository.findByShowtimeId(connection, showtimeId);
    }

    // ==========================================================
    // LẤY VÉ THEO MÃ CODE
    // ==========================================================

    async getTicketByCode(connection, ticketCode) {
        return await TicketRepository.findByCode(connection, ticketCode);
    }

    // ==========================================================
    // LẤY SƠ ĐỒ GHẾ
    // ==========================================================

    async getTicketSeatMap(connection, showtimeId) {
        return await TicketRepository.getSeatMapByShowtime(connection, showtimeId);
    }

    // ==========================================================
    // 🔥 TẠO VÉ (CÓ TÍCH HỢP PRICE_CONFIG)
    // ==========================================================

    async createTickets(connection, bookingId) {
        // 1. Lấy thông tin booking
        const bookingInfo = await TicketRepository.getBookingInfo(connection, bookingId);
        if (!bookingInfo) throw new Error("Không tìm thấy booking.");

        const { showtime_id, room_id, cinema_id } = bookingInfo;

        // 2. Lấy danh sách ghế từ booking_details
        const seatDetails = await TicketRepository.getSeatDetails(connection, bookingId);
        if (!seatDetails.length) return 0;

        // 3. Lấy thông tin showtime để biết room_type, start_time, date
        const showtimeInfo = await TicketRepository.getShowtimeInfo(connection, showtime_id);
        if (!showtimeInfo) {
            throw new Error("Không tìm thấy thông tin suất chiếu");
        }

        const roomType = showtimeInfo.room_type || '2D';
        const startTime = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toTimeString().slice(0, 8) : '09:00:00';
        const showDate = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // 4. Tạo vé với giá từ price_config
        const ticketsData = await Promise.all(seatDetails.map(async (item) => {
            // Lấy thông tin ghế để biết seat_type
            const seatInfo = await TicketRepository.getSeatInfo(connection, item.seat_id);
            const seatType = seatInfo?.seat_type || 'STANDARD';

            // 🔥 Lấy giá từ price_config
            const price = await PriceConfigService.getPrice(
                roomType,
                startTime,
                showDate,
                seatType
            );

            return [
                bookingId,
                showtime_id,
                room_id,
                cinema_id,
                item.seat_id,
                `TIC-${bookingId}-${item.seat_id}-${Date.now()}`,
                price || item.price || 0, // Fallback nếu không có giá
                "Booked",
                "Valid"
            ];
        }));

        return await TicketRepository.createBulk(connection, ticketsData);
    }

    // ==========================================================
    // CHECK-IN (ĐÁNH DẤU VÉ ĐÃ SỬ DỤNG)
    // ==========================================================

    async markTicketUsed(connection, ticketId) {
        const affected = await TicketRepository.markUsed(connection, ticketId);
        if (!affected) throw new Error("Không tìm thấy vé hoặc vé đã được sử dụng");
        return affected;
    }

    // ==========================================================
    // 🔥 TÍNH LẠI GIÁ CHO VÉ ĐÃ TỒN TẠI (CẬP NHẬT GIÁ)
    // ==========================================================

    async recalculateTicketPrices(connection, showtimeId) {
        // Lấy tất cả vé của suất chiếu
        const tickets = await TicketRepository.findByShowtimeId(connection, showtimeId);
        if (!tickets.length) return 0;

        // Lấy thông tin showtime
        const showtimeInfo = await TicketRepository.getShowtimeInfo(connection, showtimeId);
        if (!showtimeInfo) return 0;

        const roomType = showtimeInfo.room_type || '2D';
        const startTime = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toTimeString().slice(0, 8) : '09:00:00';
        const showDate = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        let updated = 0;

        for (const ticket of tickets) {
            // Lấy thông tin ghế
            const seatInfo = await TicketRepository.getSeatInfo(connection, ticket.seat_id);
            const seatType = seatInfo?.seat_type || 'STANDARD';

            // Tính giá mới
            const newPrice = await PriceConfigService.getPrice(
                roomType,
                startTime,
                showDate,
                seatType
            );

            // Cập nhật nếu giá khác
            if (newPrice !== ticket.price) {
                await connection.query(
                    `UPDATE tickets SET price = ? WHERE ticket_id = ?`,
                    [newPrice, ticket.ticket_id]
                );
                updated++;
            }
        }

        return updated;
    }
}

module.exports = new TicketService();
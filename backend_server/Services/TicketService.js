// Services/TicketService.js
const TicketRepository = require("../Repositories/TicketRepository");
const PriceConfigService = require("./PriceConfigService");
const crypto = require("crypto");

// ==========================================================
// ✅ CONFIG WINDOW CHECK-IN
// ==========================================================
const CHECKIN_BEFORE_MINUTES = 15;   // Trước 15 phút
const CHECKIN_AFTER_MINUTES = 15;    // Sau 15 phút

class TicketService {

    // ==========================================================
    // LẤY TẤT CẢ VÉ
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

    async getTicketSeatMap(connection, showtimeId) {
        return await TicketRepository.getSeatMapByShowtime(connection, showtimeId);
    }

    // ==========================================================
    // 🔥 SINH TICKET CODE NGẮN 8 KÝ TỰ
    // ==========================================================

    generateTicketCode(seed = "") {
        const input = `${seed}-${Date.now()}-${Math.random()}-${crypto.randomBytes(4).toString("hex")}`;
        const hash = crypto.createHash("md5").update(input).digest("hex");
        return hash.substring(0, 8).toUpperCase();
    }

    // ==========================================================
    // 🔥 TẠO VÉ
    // ==========================================================

    async createTickets(connection, bookingId) {
        const bookingInfo = await TicketRepository.getBookingInfo(connection, bookingId);
        if (!bookingInfo) throw new Error("Không tìm thấy booking.");

        const { showtime_id, room_id, cinema_id } = bookingInfo;

        const seatDetails = await TicketRepository.getSeatDetails(connection, bookingId);
        if (!seatDetails.length) return 0;

        const showtimeInfo = await TicketRepository.getShowtimeInfo(connection, showtime_id);
        if (!showtimeInfo) {
            throw new Error("Không tìm thấy thông tin suất chiếu");
        }

        const roomType = showtimeInfo.room_type || '2D';
        const startTime = showtimeInfo.start_time
            ? new Date(showtimeInfo.start_time).toTimeString().slice(0, 8)
            : '09:00:00';
        const showDate = showtimeInfo.start_time
            ? new Date(showtimeInfo.start_time).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        const ticketsData = await Promise.all(seatDetails.map(async (item) => {
            const seatInfo = await TicketRepository.getSeatInfo(connection, item.seat_id);
            const seatType = seatInfo?.seat_type || 'STANDARD';

            const price = await PriceConfigService.getPrice(
                roomType,
                startTime,
                showDate,
                seatType
            );

            const ticketCode = this.generateTicketCode(`${bookingId}-${item.seat_id}`);

            return [
                bookingId,
                showtime_id,
                room_id,
                cinema_id,
                item.seat_id,
                ticketCode,
                price || item.price || 0,
                "Booked",
                "Valid"
            ];
        }));

        return await TicketRepository.createBulk(connection, ticketsData);
    }

    // ==========================================================
    // ✅ CHECK-IN — CÓ VALIDATE WINDOW 15 PHÚT
    // ==========================================================
    //
    // Rules:
    //   - Window mở: showtime.start_time - 15 phút
    //   - Window đóng: showtime.start_time + 15 phút
    //   - Ngoài window → không cho soát
    //
    // @param {Connection} connection
    // @param {String} ticketCode
    // @returns {Object} { ticket, checkedInAt }
    // @throws {Error} với message cụ thể
    // ==========================================================

    async checkInTicket(connection, ticketCode) {
        // 1. Tìm vé
        const ticket = await TicketRepository.findByCode(connection, ticketCode);
        if (!ticket) {
            const err = new Error("Không tìm thấy mã vé này trong hệ thống!");
            err.code = "TICKET_NOT_FOUND";
            throw err;
        }

        // 2. Check trạng thái vé
        if (ticket.ticket_status === "Used") {
            const err = new Error("Cảnh báo: Vé này đã được soát trước đó!");
            err.code = "TICKET_ALREADY_USED";
            throw err;
        }

        if (ticket.ticket_status === "Cancelled") {
            const err = new Error("Vé này đã bị hủy. Không thể soát!");
            err.code = "TICKET_CANCELLED";
            throw err;
        }

        if (ticket.ticket_status !== "Valid") {
            const err = new Error(`Vé không hợp lệ (trạng thái: ${ticket.ticket_status})`);
            err.code = "TICKET_INVALID_STATUS";
            throw err;
        }

        // 3. ✅ CHECK WINDOW THỜI GIAN
        // Lấy start_time của suất chiếu
        const [showtimeRows] = await connection.query(
            `SELECT start_time FROM showtimes WHERE showtime_id = ? LIMIT 1`,
            [ticket.showtime_id]
        );

        if (!showtimeRows.length) {
            const err = new Error("Không tìm thấy suất chiếu của vé này!");
            err.code = "SHOWTIME_NOT_FOUND";
            throw err;
        }

        const showtimeStart = new Date(showtimeRows[0].start_time);
        const now = new Date();

        const windowOpen = new Date(
            showtimeStart.getTime() - CHECKIN_BEFORE_MINUTES * 60 * 1000
        );
        const windowClose = new Date(
            showtimeStart.getTime() + CHECKIN_AFTER_MINUTES * 60 * 1000
        );

        console.log(`🔍 [CHECK-IN] Showtime: ${showtimeStart.toISOString()}`);
        console.log(`🔍 [CHECK-IN] Window: ${windowOpen.toISOString()} → ${windowClose.toISOString()}`);
        console.log(`🔍 [CHECK-IN] Now: ${now.toISOString()}`);

        // 3a. Quá sớm
        if (now < windowOpen) {
            const minutesLeft = Math.ceil((windowOpen - now) / 1000 / 60);
            const err = new Error(
                `Chưa đến giờ soát vé. Vui lòng quay lại sau ${minutesLeft} phút ` +
                `(chỉ được soát trước ${CHECKIN_BEFORE_MINUTES} phút giờ chiếu).`
            );
            err.code = "CHECKIN_TOO_EARLY";
            err.data = {
                windowOpen: windowOpen.toISOString(),
                windowClose: windowClose.toISOString(),
                showtimeStart: showtimeStart.toISOString(),
                minutesLeft
            };
            throw err;
        }

        // 3b. Quá muộn
        if (now > windowClose) {
            const minutesLate = Math.ceil((now - windowClose) / 1000 / 60);
            const err = new Error(
                `Đã quá hạn soát vé (${minutesLate} phút). ` +
                `Vé chỉ được soát trong khoảng ${CHECKIN_BEFORE_MINUTES} phút trước ` +
                `đến ${CHECKIN_AFTER_MINUTES} phút sau giờ chiếu.`
            );
            err.code = "CHECKIN_TOO_LATE";
            err.data = {
                windowOpen: windowOpen.toISOString(),
                windowClose: windowClose.toISOString(),
                showtimeStart: showtimeStart.toISOString(),
                minutesLate
            };
            throw err;
        }

        // 4. ✅ Trong window → soát vé
        await TicketRepository.markUsed(connection, ticket.ticket_id);

        console.log(`✅ [CHECK-IN] Ticket ${ticketCode} checked in successfully`);

        return {
            ticket,
            checkedInAt: now.toISOString(),
            windowOpen: windowOpen.toISOString(),
            windowClose: windowClose.toISOString(),
            showtimeStart: showtimeStart.toISOString()
        };
    }

    // ==========================================================
    // TÍNH LẠI GIÁ VÉ
    // ==========================================================

    async recalculateTicketPrices(connection, showtimeId) {
        const tickets = await TicketRepository.findByShowtimeId(connection, showtimeId);
        if (!tickets.length) return 0;

        const showtimeInfo = await TicketRepository.getShowtimeInfo(connection, showtimeId);
        if (!showtimeInfo) return 0;

        const roomType = showtimeInfo.room_type || '2D';
        const startTime = showtimeInfo.start_time
            ? new Date(showtimeInfo.start_time).toTimeString().slice(0, 8)
            : '09:00:00';
        const showDate = showtimeInfo.start_time
            ? new Date(showtimeInfo.start_time).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        let updated = 0;

        for (const ticket of tickets) {
            const seatInfo = await TicketRepository.getSeatInfo(connection, ticket.seat_id);
            const seatType = seatInfo?.seat_type || 'STANDARD';

            const newPrice = await PriceConfigService.getPrice(
                roomType,
                startTime,
                showDate,
                seatType
            );

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

    // ==========================================================
    // LỊCH SỬ SOÁT VÉ
    // ==========================================================

    async getCheckinHistory(connection, limit = 100) {
        return await TicketRepository.getCheckinHistory(connection, limit);
    }
}

module.exports = new TicketService();
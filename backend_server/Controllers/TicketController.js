// Controllers/TicketController.js

const TicketService = require("../Services/TicketService");
const TicketRepository = require("../Repositories/TicketRepository");
const QRCode = require("qrcode");
const PriceConfigService = require("../Services/PriceConfigService");

// ==========================================================
// PUBLIC - LẤY MÃ QR
// ==========================================================

exports.getTicketQR = async (req, res) => {
    let connection;
    try {
        const { ticketCode } = req.params;

        connection = await TicketRepository.getConnection();
        const ticket = await TicketService.getTicketByCode(connection, ticketCode);
        connection.release();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Vé không tồn tại",
            });
        }

        const frontendUrl =
            process.env.FRONTEND_URL ||
            "https://admin.quangdungcinema.id.vn";

        const checkinUrl = `${frontendUrl}/check-in/${ticketCode}`;

        const qrCodeUrl = await QRCode.toDataURL(checkinUrl, {
            width: 500,
            margin: 4,
            errorCorrectionLevel: "H",
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
        });

        return res.status(200).json({
            success: true,
            qrCodeUrl,
            checkinUrl,
            ticketCode,
        });

    } catch (error) {
        if (connection) connection.release();
        console.error("getTicketQR error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================================
// ADMIN - CHECK IN (CÓ VALIDATE WINDOW 15 PHÚT)
// ==========================================================

exports.checkInTicket = async (req, res) => {
    let connection;
    try {
        const { ticketCode } = req.body;

        if (!ticketCode) {
            return res.status(400).json({
                success: false,
                code: "MISSING_TICKET_CODE",
                message: "Thiếu mã vé",
            });
        }

        connection = await TicketRepository.getConnection();

        // ✅ Gọi service check-in (có validate window 15 phút)
        const result = await TicketService.checkInTicket(connection, ticketCode);

        connection.release();

        const ticket = result.ticket;

        return res.status(200).json({
            success: true,
            message: "Soát vé thành công! Mời khách vào phòng.",
            ticket: {
                ...ticket,
                room_name: ticket.room_name || '---',
                cinema_name: ticket.cinema_name || '---',
                movie_title: ticket.movie_title || '---',
                showtime: ticket.showtime || '---',
                seat_label: `${ticket.seat_row || ''}${ticket.seat_number || ''}`,
                customer_name: ticket.customer_name || '---'
            },
            checked_in_at: result.checkedInAt,
            window: {
                open: result.windowOpen,
                close: result.windowClose,
                showtime_start: result.showtimeStart
            }
        });

    } catch (error) {
        if (connection) connection.release();
        console.error("❌ checkInTicket error:", error);

        // ✅ Trả về error code chi tiết
        const statusCode = error.code === "TICKET_NOT_FOUND" ? 404 : 400;

        return res.status(statusCode).json({
            success: false,
            code: error.code || "CHECKIN_FAILED",
            message: error.message,
            data: error.data || null
        });
    }
};

// ==========================================================
// ADMIN - LẤY TẤT CẢ VÉ
// ==========================================================

exports.getAllTickets = async (req, res) => {
    let connection;
    try {
        connection = await TicketRepository.getConnection();
        const tickets = await TicketService.getAllTickets(connection);
        connection.release();
        return res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        if (connection) connection.release();
        console.error("getAllTickets error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================================
// ADMIN - LẤY VÉ THEO SUẤT CHIẾU
// ==========================================================

exports.getTicketsByShowtime = async (req, res) => {
    let connection;
    try {
        const { showtimeId } = req.params;
        console.log(`📌 [API] getTicketsByShowtime: showtimeId=${showtimeId}`);

        connection = await TicketRepository.getConnection();
        const tickets = await TicketService.getTicketsByShowtime(connection, showtimeId);
        connection.release();

        console.log(`✅ Tickets found: ${tickets.length}`);
        return res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        if (connection) connection.release();
        console.error("❌ getTicketsByShowtime error:", error.stack || error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
        });
    }
};

// ==========================================================
// ADMIN - SƠ ĐỒ GHẾ
// ==========================================================

exports.getTicketSeatMap = async (req, res) => {
    let connection;
    try {
        const { showtimeId } = req.params;
        connection = await TicketRepository.getConnection();
        const seatMap = await TicketService.getTicketSeatMap(connection, showtimeId);
        connection.release();
        return res.status(200).json({
            success: true,
            data: seatMap,
        });
    } catch (error) {
        if (connection) connection.release();
        console.error("getTicketSeatMap error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================================
// ADMIN - LỊCH SỬ SOÁT VÉ
// ==========================================================

exports.getCheckinHistory = async (req, res) => {
    let connection;
    try {
        connection = await TicketRepository.getConnection();
        const history = await TicketService.getCheckinHistory(connection, 100);
        connection.release();

        return res.status(200).json({
            success: true,
            data: history,
        });
    } catch (error) {
        if (connection) connection.release();
        console.error("getCheckinHistory error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ==========================================================
// ADMIN - CẬP NHẬT LẠI GIÁ VÉ
// ==========================================================

exports.recalculateTicketPrices = async (req, res) => {
    let connection;
    try {
        const { showtimeId } = req.params;

        if (!showtimeId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu showtimeId",
            });
        }

        connection = await TicketRepository.getConnection();
        const updated = await TicketService.recalculateTicketPrices(connection, showtimeId);
        connection.release();

        return res.status(200).json({
            success: true,
            message: `Đã cập nhật giá cho ${updated} vé`,
            updated,
        });
    } catch (error) {
        if (connection) connection.release();
        console.error("❌ recalculateTicketPrices error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
        });
    }
};

// ==========================================================
// ADMIN - XEM GIÁ DỰ KIẾN
// ==========================================================

exports.previewTicketPrice = async (req, res) => {
    try {
        const { roomType, startTime, date, seatType } = req.query;

        if (!roomType || !startTime || !date) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin: roomType, startTime, date",
            });
        }

        const price = await PriceConfigService.getPrice(
            roomType,
            startTime,
            date,
            seatType || 'STANDARD'
        );

        return res.status(200).json({
            success: true,
            data: {
                roomType,
                startTime,
                date,
                seatType: seatType || 'STANDARD',
                price,
            },
            message: "Lấy giá dự kiến thành công",
        });
    } catch (error) {
        console.error("❌ previewTicketPrice error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
        });
    }
};
const TicketService = require("../Services/TicketService");
const TicketRepository = require("../Repositories/TicketRepository");
const QRCode = require("qrcode");

// ==========================================================
// PUBLIC - LẤY MÃ QR
// ==========================================================

exports.getTicketQR = async (req, res) => {
  try {
    const { ticketCode } = req.params;
    const qrCodeUrl = await QRCode.toDataURL(ticketCode, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return res.status(200).json({
      success: true,
      qrCodeUrl,
    });
  } catch (error) {
    console.error("getTicketQR error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================================
// ADMIN - CHECK IN
// ==========================================================

exports.checkInTicket = async (req, res) => {
  let connection;
  try {
    const { ticketCode } = req.body;

    if (!ticketCode) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã vé",
      });
    }

    connection = await TicketRepository.getConnection();
    const ticket = await TicketService.getTicketByCode(connection, ticketCode);
    if (!ticket) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã vé này trong hệ thống!",
      });
    }

    if (ticket.ticket_status === "Used") {
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Cảnh báo: Vé này đã được soát trước đó!",
      });
    }

    await TicketService.markTicketUsed(connection, ticket.ticket_id);
    connection.release();

    // 👇 Trả về thêm thông tin room_name
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
    });
  } catch (error) {
    if (connection) connection.release();
    console.error("checkInTicket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
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
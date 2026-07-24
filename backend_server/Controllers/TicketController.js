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
  const connection = await TicketRepository.getConnection();
  try {
    const { ticketCode } = req.body;

    if (!ticketCode) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã vé",
      });
    }

    const ticket = await TicketService.getTicketByCode(connection, ticketCode);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã vé này trong hệ thống!",
      });
    }

    if (ticket.ticket_status === "Used") {
      return res.status(400).json({
        success: false,
        message: "Cảnh báo: Vé này đã được soát trước đó!",
      });
    }

    await TicketService.markTicketUsed(connection, ticket.ticket_id);
    connection.release();

    return res.status(200).json({
      success: true,
      message: "Soát vé thành công! Mời khách vào phòng.",
      ticket,
    });
  } catch (error) {
    connection.release();
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
  const connection = await TicketRepository.getConnection();
  try {
    const tickets = await TicketService.getAllTickets(connection);
    connection.release();
    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    connection.release();
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
  const connection = await TicketRepository.getConnection();
  try {
    const { showtimeId } = req.params;
    const tickets = await TicketService.getTicketsByShowtime(connection, showtimeId);
    connection.release();
    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    connection.release();
    console.error("getTicketsByShowtime error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================================
// ADMIN - SƠ ĐỒ GHẾ
// ==========================================================

exports.getTicketSeatMap = async (req, res) => {
  const connection = await TicketRepository.getConnection();
  try {
    const { showtimeId } = req.params;
    const seatMap = await TicketService.getTicketSeatMap(connection, showtimeId);
    connection.release();
    return res.status(200).json({
      success: true,
      data: seatMap,
    });
  } catch (error) {
    connection.release();
    console.error("getTicketSeatMap error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
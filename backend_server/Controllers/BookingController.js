const BookingService = require("../Services/BookingService");
const TicketService = require("../Services/TicketService");
const PointsService = require("../Services/PointsService");
const BookingRepository = require("../Repositories/BookingRepository");

exports.getAllBookings = async (req, res) => {
  try {
    const data = await BookingService.getAllBookings();
    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách booking",
    });
  }
};

exports.getBookingDetails = async (req, res) => {
  const connection = await BookingRepository.getConnection();
  try {
    const { id } = req.params;

    const booking = await BookingService.getBookingDetail(connection, id);
    if (!booking) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    const tickets = await TicketService.getTicketsByBooking(connection, id);
    const foods = await BookingService.getFoodDetail(connection, id);

    connection.release();

    return res.json({
      success: true,
      booking,
      tickets,
      foods,
    });
  } catch (error) {
    connection.release();
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const connection = await BookingRepository.getConnection();
  try {
    await BookingRepository.beginTransaction(connection);

    const { id } = req.params;
    const { status } = req.body;

    const booking = await BookingService.findBookingById(connection, id);
    if (!booking) {
      await BookingRepository.rollback(connection);
      connection.release();
      throw new Error("Không tìm thấy booking");
    }

    const oldStatus = booking.status;
    const newStatus = String(status || "").toUpperCase();

    // Update status
    await BookingService.completeBooking(connection, id);
    // Hoặc dùng updateStatus nếu muốn linh hoạt
    // await BookingRepository.updateStatus(connection, id, status);

    // Nếu chuyển sang Completed
    if (newStatus === "COMPLETED") {
      await TicketService.bookTickets(connection, id);
      if (String(oldStatus).toUpperCase() !== "COMPLETED") {
        const points = await PointsService.calculateBookingPoints(connection, id);
        await PointsService.addPointsToUser(connection, booking.user_id, points);
      }
    }

    // Nếu chuyển sang Cancelled
    if (newStatus === "CANCELLED") {
      await TicketService.cancelTickets(connection, id);
    }

    await BookingRepository.commit(connection);
    connection.release();

    return res.json({
      success: true,
      message: `Đã cập nhật đơn #${id} thành ${status}`,
    });
  } catch (error) {
    await BookingRepository.rollback(connection);
    connection.release();
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await BookingService.deleteBooking(id);
    if (!affected) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }
    return res.json({
      success: true,
      message: "Xóa booking thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
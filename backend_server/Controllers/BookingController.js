const BookingService = require("../Services/BookingService");
const TicketService = require("../Services/TicketService");
const PointsService = require("../Services/PointsService");
const BookingRepository = require("../Repositories/BookingRepository");

/* ==========================================================
    GET ALL BOOKINGS
========================================================== */
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

/* ==========================================================
    GET BOOKING DETAILS
========================================================== */
exports.getBookingDetails = async (req, res) => {
  const connection = await BookingRepository.getConnection();
  try {
    const { booking_id } = req.params; // ✅ sửa

    const booking = await BookingService.getBookingDetail(connection, booking_id);
    if (!booking) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    const tickets = await TicketService.getTicketsByBooking(connection, booking_id);
    const foods = await BookingService.getFoodDetail(connection, booking_id);

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

/* ==========================================================
    UPDATE BOOKING STATUS
========================================================== */
exports.updateBookingStatus = async (req, res) => {
  const connection = await BookingRepository.getConnection();
  try {
    await BookingRepository.beginTransaction(connection);

    const { booking_id } = req.params; // ✅ sửa
    const { status } = req.body;

    const booking = await BookingService.findBookingById(connection, booking_id);
    if (!booking) {
      await BookingRepository.rollback(connection);
      connection.release();
      throw new Error("Không tìm thấy booking");
    }

    const oldStatus = booking.status;
    const newStatus = String(status || "").toUpperCase();

    // Update status
    await BookingService.completeBooking(connection, booking_id);

    // Nếu chuyển sang Completed
    if (newStatus === "COMPLETED") {
      await TicketService.bookTickets(connection, booking_id);
      if (String(oldStatus).toUpperCase() !== "COMPLETED") {
        const points = await PointsService.calculateBookingPoints(connection, booking_id);
        await PointsService.addPointsToUser(connection, booking.user_id, points);
      }
    }

    // Nếu chuyển sang Cancelled
    if (newStatus === "CANCELLED") {
      await TicketService.cancelTickets(connection, booking_id);
    }

    await BookingRepository.commit(connection);
    connection.release();

    return res.json({
      success: true,
      message: `Đã cập nhật đơn #${booking_id} thành ${status}`,
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

/* ==========================================================
    DELETE BOOKING
========================================================== */
exports.deleteBooking = async (req, res) => {
  try {
    const { booking_id } = req.params; // ✅ sửa
    const affected = await BookingService.deleteBooking(booking_id);
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
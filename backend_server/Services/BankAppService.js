const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailServiceTicket = require("./MailServiceTicket");

class BankAppService {
  /**
   * Hoàn tất thanh toán qua ngân hàng
   */
  async completeBankPayment(connection, bookingId) {
    // 1. Cập nhật trạng thái booking thành Completed
    await BookingService.completeBooking(connection, bookingId);

    // 2. Đặt vé (book tickets)
    await TicketService.bookTickets(connection, bookingId);

    // 3. Lấy chi tiết đơn hàng
    const order = await BookingService.getBookingDetail(connection, bookingId);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // 4. Cộng điểm cho user
    const points = await PointsService.calculateBookingPoints(connection, bookingId);
    if (points > 0) {
      await PointsService.addPointsToUser(connection, order.user_id, points);
    }

    // 5. Gửi email vé (chỉ gửi 1 lần, không retry)
    const foods = await BookingService.getFoodDetail(connection, bookingId);
    const foodString = foods.length
      ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
      : "Không có";

    const ticketData = {
      bookingId: order.booking_id,
      customerName: order.full_name,
      movieTitle: order.movie_name,
      moviePoster: order.movie_poster,
      cinemaName: order.cinema_name,
      startTime: order.start_time.split(" ")[1].substring(0, 5),
      selectedDate: order.start_time.split(" ")[0].split("-").reverse().join("/"),
      seatLabel: order.seat_label,
      selectedFoods: foodString,
      earnedPoints: points,
    };

    // Gửi email 1 lần duy nhất, nếu lỗi chỉ log
    try {
      await MailServiceTicket.sendTicketEmail(order.email, ticketData);
      console.log(`✅ Email ticket sent successfully for booking ${bookingId}`);
    } catch (err) {
      console.error(`❌ Failed to send ticket email for booking ${bookingId}:`, err.message);
      // Không throw lỗi vì giao dịch đã thành công, chỉ log để admin biết
    }

    return true;
  }

  /**
   * Hủy booking khi hết thời gian thanh toán
   */
  async cancelBookingTimeout(connection, bookingId, email) {
    // Hủy booking
    await BookingService.cancelBooking(connection, bookingId);

    // Giải phóng ghế
    await TicketService.releaseTickets(connection, bookingId);

    // Xóa OTP nếu có
    if (email) {
      await OtpService.deleteOTP(email, PURPOSE.PAYMENT);
    }

    return true;
  }
}

module.exports = new BankAppService();
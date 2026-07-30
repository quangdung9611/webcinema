const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailServiceTicket = require("./MailServiceTicket");

class BankAppService {
  async completeBankPayment(connection, bookingId) {
    // 1. Complete booking
    await BookingService.completeBooking(connection, bookingId);

    // 2. Book tickets
    await TicketService.bookTickets(connection, bookingId);

    // 3. Get order detail
    const order = await BookingService.getBookingDetail(connection, bookingId);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // 4. Add points
    const points = await PointsService.calculateBookingPoints(connection, bookingId);
    if (points > 0) {
      await PointsService.addPointsToUser(connection, order.user_id, points);
    }

    // 5. Send ticket email với retry
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

    // Retry logic: gửi email tối đa 3 lần
    let retries = 3;
    let lastError = null;
    while (retries > 0) {
      try {
        await MailServiceTicket.sendTicketEmail(order.email, ticketData);
        console.log(`✅ Email ticket sent successfully for booking ${bookingId}`);
        break; // thành công -> thoát vòng lặp
      } catch (err) {
        lastError = err;
        retries--;
        console.error(`❌ Failed to send ticket email (retries left: ${retries})`, err.message);
        if (retries === 0) {
          console.error(`❌ All retries exhausted for email to ${order.email}`);
          // Có thể ghi vào bảng log lỗi nếu cần
        }
        // Chờ 1s trước khi retry
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Nếu đã thử hết mà vẫn lỗi, không throw lỗi vì giao dịch đã thành công
    // Chỉ log để admin biết và xử lý sau

    return true;
  }

  async cancelBookingTimeout(connection, bookingId, email) {
    await BookingService.cancelBooking(connection, bookingId);
    await TicketService.releaseTickets(connection, bookingId);
    if (email) {
      await OtpService.deleteOTP(email, PURPOSE.PAYMENT);
    }
    return true;
  }
}

module.exports = new BankAppService();
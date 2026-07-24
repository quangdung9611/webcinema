const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
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

    // 5. Send ticket email
    const foods = await BookingService.getFoodDetail(connection, bookingId);
    const foodString = foods.length
      ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
      : "Không có";

    await MailServiceTicket.sendTicketEmail(order.email, {
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
    }).catch(console.error);

    return true;
  }

  async cancelBookingTimeout(connection, bookingId, email) {
    await BookingService.cancelBooking(connection, bookingId);
    await TicketService.releaseTickets(connection, bookingId);
    if (email) {
      await OtpService.deleteOTP(email, "PAYMENT");
    }
    return true;
  }
}

module.exports = new BankAppService();
const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const MailServiceTicket = require("./MailServiceTicket");
const axios = require("axios");
const crypto = require("crypto");

class MomoService {
  async createPayment(bookingId, amount) {
    const partnerCode = "MOMOBKUN20180810";
    const accessKey = "klm05ndA99cl4UXT";
    const secretKey = "f06nd13v6u1234567890abcdefghijk";
    const requestId = partnerCode + Date.now();
    const orderId = String(bookingId);
    const orderInfo = `Thanh toán vé Cinema Star #${bookingId}`;
    const redirectUrl = "https://quangdungcinema.id.vn/confirm-success";
    const ipnUrl = "https://api.quangdungcinema.id.vn/api/momo/callback";
    const requestType = "payWithMethod";
    const extraData = "";

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const response = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        signature,
        lang: "vi",
      }
    );

    return response.data;
  }

  async completeMomoPayment(connection, bookingId) {
    const booking = await BookingService.findBookingById(connection, bookingId);
    if (!booking) throw new Error("Không tìm thấy đơn hàng");

    const status = await BookingService.getBookingStatus(connection, bookingId);
    if (status === "Completed") return;

    await BookingService.completeBooking(connection, bookingId);
    await TicketService.bookTickets(connection, bookingId);

    const order = await BookingService.getBookingDetail(connection, bookingId);
    const points = await PointsService.calculateBookingPoints(connection, bookingId);
    if (points > 0) {
      await PointsService.addPointsToUser(connection, order.user_id, points);
    }

    // Send email
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

  async confirmMomoFast(connection, bookingId) {
    return await this.completeMomoPayment(connection, bookingId);
  }
}

module.exports = new MomoService();
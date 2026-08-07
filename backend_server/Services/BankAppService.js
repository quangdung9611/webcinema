const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailServiceTicket = require("./MailServiceTicket");

class BankAppService {
    /**
     * Gửi email vé sau khi thanh toán thành công
     */
    async sendTicketEmail(connection, bookingId) {
        try {
            const order = await BookingService.getBookingDetail(connection, bookingId);
            if (!order) throw new Error("Không tìm thấy đơn hàng");

            const foods = await BookingService.getFoodDetail(connection, bookingId);
            const foodString = foods.length
                ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
                : "Không có";

            const points = await PointsService.calculateBookingPoints(connection, bookingId);

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

            await MailServiceTicket.sendTicketEmail(order.email, ticketData);
            console.log(`✅ Email ticket sent for booking ${bookingId}`);
        } catch (err) {
            console.error(`❌ Failed to send ticket email:`, err.message);
            // Không throw lỗi
        }
    }

    /**
     * Cộng điểm cho user
     */
    async addPoints(connection, bookingId, userId) {
        try {
            const points = await PointsService.calculateBookingPoints(connection, bookingId);
            if (points > 0) {
                await PointsService.addPointsToUser(connection, userId, points);
            }
        } catch (err) {
            console.error(`❌ Failed to add points:`, err.message);
        }
    }
}

module.exports = new BankAppService();
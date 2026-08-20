const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailServiceTicket = require("./MailServiceTicket");


class BankAppService {


    /*=========================================================
        GỬI EMAIL VÉ SAU KHI THANH TOÁN THÀNH CÔNG
    =========================================================*/

    async sendTicketEmail(connection, bookingId) {

        try {

            /*=====================================================
                LẤY THÔNG TIN ĐƠN HÀNG
            =====================================================*/

            const order =
                await BookingService.getBookingDetail(
                    connection,
                    bookingId
                );


            if (!order) {
                throw new Error("Không tìm thấy đơn hàng");
            }


            /*=====================================================
                LẤY DANH SÁCH ĐỒ ĂN
            =====================================================*/

            const foods =
                await BookingService.getFoodDetail(
                    connection,
                    bookingId
                );


            const foodString =
                foods.length
                    ? foods
                        .map(
                            f =>
                                `${f.item_name} (x${f.quantity})`
                        )
                        .join(", ")
                    : "Không có";


            /*=====================================================
                TÍNH ĐIỂM
            =====================================================*/

            const points =
                await PointsService.calculateBookingPoints(
                    connection,
                    bookingId
                );


            /*=====================================================
                CHUẨN BỊ DỮ LIỆU EMAIL
            =====================================================*/

            const ticketData = {

                bookingId:
                    order.booking_id,


                customerName:
                    order.full_name,


                /*-------------------------------------------------
                    PHIM
                -------------------------------------------------*/

                movieTitle:
                    order.movie_name,


                moviePoster:
                    order.movie_poster,


                /*-------------------------------------------------
                    RẠP
                -------------------------------------------------*/

                cinemaName:
                    order.cinema_name,


                /*-------------------------------------------------
                    PHÒNG
                -------------------------------------------------*/

                roomName:
                    order.room_name || "---",


                /*-------------------------------------------------
                    SUẤT CHIẾU
                -------------------------------------------------*/

                startTime:
                    order.start_time
                        ? order.start_time
                            .split(" ")[1]
                            ?.substring(0, 5)
                        : "---",


                selectedDate:
                    order.start_time
                        ? order.start_time
                            .split(" ")[0]
                            .split("-")
                            .reverse()
                            .join("/")
                        : "---",


                /*-------------------------------------------------
                    GHẾ
                -------------------------------------------------*/

                seatLabel:
                    order.seat_label || "---",


                /*-------------------------------------------------
                    ĐỒ ĂN
                -------------------------------------------------*/

                selectedFoods:
                    foodString,


                /*-------------------------------------------------
                    ĐIỂM TÍCH LŨY
                -------------------------------------------------*/

                earnedPoints:
                    points || 0,


                /*-------------------------------------------------
                    MÃ NHẬN VÉ
                -------------------------------------------------*/

                ticketPIN:
                    order.pin ||
                    (
                        order.memo
                            ? order.memo.slice(-6)
                            : ""
                    )

            };


            /*=====================================================
                GỬI EMAIL
            =====================================================*/

            await MailServiceTicket.sendTicketEmail(
                order.email,
                ticketData
            );


            console.log(
                `✅ Email ticket sent for booking ${bookingId}`
            );


        } catch (err) {

            console.error(
                `❌ Failed to send ticket email:`,
                err.message
            );

            // Không throw lỗi để tránh ảnh hưởng
            // đến luồng thanh toán chính

        }

    }


    /*=========================================================
        CỘNG ĐIỂM CHO USER
    =========================================================*/

    async addPoints(connection, bookingId, userId) {

        try {

            const points =
                await PointsService.calculateBookingPoints(
                    connection,
                    bookingId
                );


            if (points > 0) {

                await PointsService.addPointsToUser(
                    connection,
                    userId,
                    points
                );

            }

        } catch (err) {

            console.error(
                `❌ Failed to add points:`,
                err.message
            );

        }

    }

}


module.exports = new BankAppService();
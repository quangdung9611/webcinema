const db = require('../Config/db');

const mailService = require('../Services/MailServiceTicket');
const otpService = require('../Services/OtpService');
const bookingService = require('../Services/BookingService');
const ticketService = require('../Services/TicketService');
const pointsService = require('../Services/PointsService');

/* =========================================================
   SEND OTP
========================================================= */

exports.sendOTP = async (req, res) => {
    try {

        const { email, bookingId } = req.body;

        if (!email || !bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu email hoặc bookingId'
            });
        }

        const otp = await otpService.createOTP(
            email,
            'PAYMENT'
        );

        mailService
            .sendOTP(email, otp, bookingId)
            .catch(error => {
                console.error(
                    'Lỗi gửi OTP:',
                    error
                );
            });

        return res.json({
            success: true,
            message: 'Mã OTP đang được gửi!'
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

/* =========================================================
   VERIFY OTP & COMPLETE PAYMENT
========================================================= */

exports.verifyOTP = async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const {
            email,
            otp,
            bookingId
        } = req.body;

        const verifyResult =
            await otpService.verifyOTP(
                email,
                otp,
                'PAYMENT'
            );

        if (!verifyResult.success) {
            return res
                .status(400)
                .json(verifyResult);
        }

        const otpRecord =
            verifyResult.data;

        await connection.beginTransaction();

        /* ==========================
           COMPLETE BOOKING
        ========================== */

        await bookingService.completeBooking(
            connection,
            bookingId
        );

        /* ==========================
           BOOK TICKETS
        ========================== */

        await ticketService.bookTickets(
            connection,
            bookingId
        );

        /* ==========================
           GET ORDER
        ========================== */

        const order =
            await bookingService.getBookingDetail(
                connection,
                bookingId
            );

        if (!order) {
            throw new Error(
                'Không tìm thấy dữ liệu đơn hàng!'
            );
        }

        /* ==========================
           ADD POINTS
        ========================== */

        const totalPoints =
            await pointsService.calculateBookingPoints(
                connection,
                bookingId
            );

        if (totalPoints > 0) {
            await pointsService.addPointsToUser(
                connection,
                order.user_id,
                totalPoints
            );
        }

        /* ==========================
           MARK OTP USED
        ========================== */

        await otpService.markUsed(
            otpRecord.otp_id
        );

        await connection.commit();

        /* ==========================
           GET FOODS
        ========================== */

        const foods =
            await bookingService.getFoodDetail(
                connection,
                bookingId
            );

        const foodString =
            foods.length
                ? foods
                    .map(
                        food =>
                            `${food.item_name} (x${food.quantity})`
                    )
                    .join(', ')
                : 'Không có';
        /* ==========================
   SEND TICKET EMAIL
========================== */

mailService
    .sendTicketEmail(
        email,
        {
            bookingId:
                order.booking_id,

            customerName:
                order.full_name,

            movieTitle:
                order.movie_name,

            moviePoster:
                order.movie_poster,

            cinemaName:
                order.cinema_name,

            startTime:
                order.start_time
                    .split(' ')[1]
                    .substring(0, 5),

            selectedDate:
                order.start_time
                    .split(' ')[0]
                    .split('-')
                    .reverse()
                    .join('/'),

            seatLabel:
                order.seat_label,

            selectedFoods:
                foodString
        }
    )
    .catch(error => {

        console.error(
            'Lỗi gửi vé:',
            error
        );

    });

        return res.json({

            success: true,

            message:
                'Thanh toán thành công!',

            data: {
                orderId:
                    order.booking_id
            }

        });

    } catch (error) {

        await connection.rollback();

        console.error(error);

        return res.status(500).json({

            success: false,
            message: error.message

        });

    } finally {

        connection.release();

    }
};

/* =========================================================
   CANCEL BOOKING TIMEOUT
========================================================= */

exports.cancelBookingTimeout = async (
    req,
    res
) => {

    const connection =
        await db.getConnection();

    try {

        const {
            bookingId,
            email
        } = req.body;

        await connection.beginTransaction();

        await bookingService.cancelBooking(
            connection,
            bookingId
        );

        await ticketService.releaseTickets(
            connection,
            bookingId
        );

        if (email) {

            await otpService.deleteOTP(
                email,
                'PAYMENT'
            );

        }

        await connection.commit();

        return res.json({

            success: true,

            message:
                'Hết thời gian thanh toán, ghế đã được giải phóng.'

        });

    } catch (error) {

        await connection.rollback();

        return res.status(500).json({

            success: false,
            message: error.message

        });

    } finally {

        connection.release();

    }
};
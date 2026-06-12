const axios = require('axios');
const crypto = require('crypto');
const db = require('../Config/db');

const bookingService =
    require('../Services/BookingService');

const ticketService =
    require('../Services/TicketService');

const pointsService =
    require('../Services/PointsService');

const mailService =
    require('../Services/MailServiceTicket');

/* =========================================================
    CREATE MOMO PAYMENT
========================================================= */

exports.createPayment = async (req, res) => {

    try {

        const {
            bookingId,
            amount
        } = req.body;

        const partnerCode =
            'MOMOBKUN20180810';

        const accessKey =
            'klm05ndA99cl4UXT';

        const secretKey =
            'f06nd13v6u1234567890abcdefghijk';

        const requestId =
            partnerCode + Date.now();

        const orderId =
            String(bookingId);

        const orderInfo =
            `Thanh toán vé Cinema Star #${bookingId}`;

        const redirectUrl =
            'https://quangdungcinema.id.vn/confirm-success';

        const ipnUrl =
            'https://api.quangdungcinema.id.vn/api/momo/callback';

        const requestType =
            'payWithMethod';

        const extraData = '';

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

        const signature =
            crypto
                .createHmac(
                    'sha256',
                    secretKey
                )
                .update(rawSignature)
                .digest('hex');

        const response =
            await axios.post(
                'https://test-payment.momo.vn/v2/gateway/api/create',
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
                    lang: 'vi'
                }
            );

        return res.json(
            response.data
        );

    } catch (error) {

        console.error(
            '❌ createPayment error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Không thể tạo giao dịch MoMo'
        });

    }

};

/* =========================================================
    FAST CONFIRM
========================================================= */

exports.confirmMomoFast =
    async (req, res) => {

        const connection =
            await db.getConnection();

        try {

            const {
                bookingId
            } = req.body;

            await connection.beginTransaction();

            const booking =
                await bookingService.findBookingById(
                    connection,
                    bookingId
                );

            if (!booking) {

                throw new Error(
                    'Không tìm thấy đơn hàng'
                );

            }

            const status =
                await bookingService.getBookingStatus(
                    connection,
                    bookingId
                );

            if (
                status === 'Completed'
            ) {

                await connection.commit();

                return res.json({
                    success: true,
                    message:
                        'Đơn hàng đã được xử lý trước đó'
                });

            }

            await bookingService.completeBooking(
                connection,
                bookingId
            );

            await ticketService.bookTickets(
                connection,
                bookingId
            );

            const order =
                await bookingService.getBookingDetail(
                    connection,
                    bookingId
                );

            const points =
                await pointsService.calculateBookingPoints(
                    connection,
                    bookingId
                );

            await pointsService.addPointsToUser(
                connection,
                order.user_id,
                points
            );

            await connection.commit();

            const foods =
                await bookingService.getFoodDetail(
                    connection,
                    bookingId
                );

            const foodString =
                foods.length
                    ? foods
                        .map(
                            item =>
                                `${item.item_name} (x${item.quantity})`
                        )
                        .join(', ')
                    : 'Không có';

            mailService
                .sendTicketEmail(
                    order.email,
                    {
                        bookingId:
                            order.booking_id,

                        customerName:
                            order.full_name,

                        movieTitle:
                            order.movieTitle,

                        moviePoster:
                            order.moviePoster,

                        cinemaName:
                            order.cinemaName,

                        startTime:
                            order.start_time_raw
                                .split(' ')[1]
                                .substring(0, 5),

                        selectedDate:
                            order.start_time_raw
                                .split(' ')[0]
                                .split('-')
                                .reverse()
                                .join('/'),

                        seatLabel:
                            order.seatLabel,

                        selectedFoods:
                            foodString,

                        earnedPoints:
                            points
                    }
                )
                .catch(console.error);

            return res.json({

                success: true,

                message:
                    'Thanh toán thành công'

            });

        } catch (error) {

            await connection.rollback();

            console.error(
                '❌ confirmMomoFast error:',
                error
            );

            return res.status(500).json({

                success: false,
                message: error.message

            });

        } finally {

            connection.release();

        }

    };

/* =========================================================
    MOMO CALLBACK (IPN)
========================================================= */

exports.callback =
    async (req, res) => {

        const {
            orderId,
            resultCode
        } = req.body;

        if (resultCode !== 0) {

            return res.status(204).send();

        }

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            const status =
                await bookingService.getBookingStatus(
                    connection,
                    orderId
                );

            if (
                status !== 'Completed'
            ) {

                await bookingService.completeBooking(
                    connection,
                    orderId
                );

                await ticketService.bookTickets(
                    connection,
                    orderId
                );

                const order =
                    await bookingService.getBookingDetail(
                        connection,
                        orderId
                    );

                const points =
                    await pointsService.calculateBookingPoints(
                        connection,
                        orderId
                    );

                await pointsService.addPointsToUser(
                    connection,
                    order.user_id,
                    points
                );
            }

            await connection.commit();

        } catch (error) {

            await connection.rollback();

            console.error(
                '❌ MOMO CALLBACK ERROR:',
                error
            );

        } finally {

            connection.release();

        }

        return res.status(204).send();

    };
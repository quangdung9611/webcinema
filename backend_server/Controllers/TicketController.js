const db = require('../Config/db');
const QRCode = require('qrcode');

const ticketService = require('../Services/TicketService');

/* =========================================================
    1. GET QR CODE
========================================================= */

exports.getTicketQR = async (req, res) => {

    try {

        const { ticketCode } = req.params;

        const qrCodeUrl =
            await QRCode.toDataURL(
                ticketCode,
                {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }
            );

        return res.status(200).json({
            success: true,
            qrCodeUrl
        });

    } catch (error) {

        console.error(
            '❌ getTicketQR error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

/* =========================================================
    2. CHECK IN TICKET
========================================================= */

exports.checkInTicket = async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const { ticketCode } =
            req.body;

        if (!ticketCode) {

            return res.status(400).json({
                success: false,
                message: 'Thiếu mã vé'
            });

        }

        const ticket =
            await ticketService.getTicketByCode(
                connection,
                ticketCode
            );

        if (!ticket) {

            return res.status(404).json({
                success: false,
                message:
                    'Không tìm thấy mã vé này trong hệ thống!'
            });

        }

        if (
            ticket.ticket_status === 'Used'
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Cảnh báo: Vé này đã được soát trước đó!'
            });

        }

        await ticketService.markTicketUsed(
            connection,
            ticket.ticket_id
        );

        return res.status(200).json({

            success: true,

            message:
                'Soát vé thành công! Mời khách vào phòng.',

            ticket

        });

    } catch (error) {

        console.error(
            '❌ checkInTicket error:',
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
    3. GET ALL TICKETS
========================================================= */

exports.getAllTickets = async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const tickets =
            await ticketService.getAllTickets(
                connection
            );

        return res.status(200).json({
            success: true,
            data: tickets
        });

    } catch (error) {

        console.error(
            '❌ getAllTickets error:',
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
    4. GET TICKETS BY SHOWTIME
========================================================= */

exports.getTicketsByShowtime =
    async (req, res) => {

        const connection =
            await db.getConnection();

        try {

            const { showtimeId } =
                req.params;

            const tickets =
                await ticketService.getTicketsByShowtime(
                    connection,
                    showtimeId
                );

            return res.status(200).json({
                success: true,
                data: tickets
            });

        } catch (error) {

            console.error(
                '❌ getTicketsByShowtime error:',
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
    5. GET TICKET SEAT MAP
========================================================= */

exports.getTicketSeatMap =
    async (req, res) => {

        const connection =
            await db.getConnection();

        try {

            const { showtimeId } =
                req.params;

            const seatMap =
                await ticketService.getTicketSeatMap(
                    connection,
                    showtimeId
                );

            return res.status(200).json({
                success: true,
                data: seatMap
            });

        } catch (error) {

            console.error(
                '❌ getTicketSeatMap error:',
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
// =========================================================
// IMPORTS
// =========================================================

const path = require('path');

const fs = require('fs');

const transporter =
    require('../Config/mailer');

const OtpEmailTemplate =
    require('../Templates/OtpEmailTemplate');

const TicketEmailTemplate =
    require('../Templates/TicketEmailTemplate');

// =========================================================
// MAIL SERVICE
// =========================================================

const MailServiceTicket = {

    // =====================================================
    // SEND PAYMENT OTP
    // =====================================================

    sendOTP: async (
        email,
        otp,
        bookingId
    ) => {

        return transporter.sendMail({

            from:
                `"Dũng Cinema 🍿" <${process.env.EMAIL_USER}>`,

            to: email,

            subject:
                `[${otp}] Mã xác thực thanh toán Cinema Star`,

            html: OtpEmailTemplate(

                otp,
                bookingId

            )

        });

    },

    // =====================================================
    // SEND TICKET EMAIL
    // =====================================================

    sendTicketEmail: async (

        customerEmail,
        ticketData

    ) => {

        // =================================================
        // GET POSTER
        // =================================================

        const {

            moviePoster

        } = ticketData;

        // =================================================
        // FILE NAME
        // =================================================

        const fileName = moviePoster

            ? path.basename(moviePoster)

            : null;

        // =================================================
        // ABSOLUTE PATH
        // =================================================

        const absolutePath = fileName

            ? path.join(

                __dirname,

                '..',

                'uploads',

                'posters',

                fileName

            )

            : null;

        // =================================================
        // CHECK FILE EXISTS
        // =================================================

        const fileExists =

            absolutePath &&

            fs.existsSync(absolutePath);

        // =================================================
        // MAIL OPTIONS
        // =================================================

        const mailOptions = {

            from:
                `"Dũng Cinema 🍿" <${process.env.EMAIL_USER}>`,

            to: customerEmail,

            subject:
                `[VÉ ĐIỆN TỬ] ${ticketData.movieTitle?.toUpperCase()} - MÃ ĐƠN #${ticketData.bookingId}`,

            html: TicketEmailTemplate(

                ticketData,
                fileExists

            ),

            attachments: fileExists

                ? [

                    {

                        filename: fileName,

                        path: absolutePath,

                        cid: 'poster_img'

                    }

                ]

                : []

        };

        // =================================================
        // SEND MAIL
        // =================================================

        return transporter.sendMail(

            mailOptions

        );

    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailServiceTicket;
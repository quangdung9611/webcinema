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

    sendOTP: async (email, otp, bookingId) => {

        // DEBUG
        console.log(
            `DEBUG: Nhận yêu cầu gửi OTP tới: ${email}, OTP: ${otp}, BookingID: ${bookingId}`
        );

        // CHECK EMAIL
        if (!email) {

            console.error(
                "❌ LỖI: Email người nhận bị trống!"
            );

            return;
        }

        try {

            console.log(
                '📨 Đang chuẩn bị gửi OTP mail...'
            );

            const info = await transporter.sendMail({

                // =================================================
                // SENDER EMAIL ĐÃ VERIFY TRÊN BREVO
                // =================================================

                // Đã đổi thành email tên miền của bạn
                from:
                    `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,

                to: email,

                subject:
                    `[${otp}] Mã xác thực thanh toán Cinema Star`,

                html:
                    OtpEmailTemplate(otp, bookingId)

            });

            console.log(
                '✅ OTP MAIL SENT SUCCESSFULLY'
            );

            console.log(info);

            return info;

        }
        catch (err) {

            console.log(
                '❌ OTP MAIL ERROR'
            );

            console.log(err);

            throw err;
        }
    },

    // =====================================================
    // SEND TICKET EMAIL
    // =====================================================

    sendTicketEmail: async (

        customerEmail,
        ticketData

    ) => {

        try {

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

            console.log({

                fileName,
                absolutePath,
                fileExists

            });

            // =================================================
            // MAIL OPTIONS
            // =================================================

            const mailOptions = {

                // =================================================
                // VERIFIED BREVO SENDER
                // =================================================

                // Đã đổi thành email tên miền của bạn
                from:
                    `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,

                to: customerEmail,

                subject:
                    `[VÉ ĐIỆN TỬ] ${ticketData.movieTitle?.toUpperCase()} - MÃ ĐƠN #${ticketData.bookingId}`,

                html: TicketEmailTemplate(

                    ticketData,
                    fileExists

                ),

                // =================================================
                // ATTACHMENTS
                // =================================================

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

            console.log(
                '📨 Đang gửi vé điện tử...'
            );

            const info = await transporter.sendMail(

                mailOptions

            );

            console.log(

                '✅ TICKET MAIL SENT SUCCESSFULLY'

            );

            console.log(info);

            return info;

        }
        catch (err) {

            console.log(

                '❌ TICKET MAIL ERROR'

            );

            console.log(err);

            throw err;

        }

    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailServiceTicket;
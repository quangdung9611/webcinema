// =========================================================
// IMPORTS
// =========================================================

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { transporter } = require("../Config/mailer");

const OtpEmailTemplate = require("../Templates/OtpEmailTemplate");
const TicketEmailTemplate = require("../Templates/TicketEmailTemplate");
const ResetPasswordOtpTemplate = require("../Templates/ResetPasswordOtpTemplate");
const VerifyEmailTemplate = require("../Templates/VerifyEmailTemplate");

// =========================================================
// MAIL SERVICE
// =========================================================

const MailServiceTicket = {

    // =====================================================
    // SEND PAYMENT OTP
    // =====================================================

    sendOTP: async (email, otp, bookingId) => {

        console.log(`📨 SEND OTP -> ${email} | Booking: ${bookingId}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Dũng Cinema`,
                html: OtpEmailTemplate(otp, bookingId)

            });

            console.log("✅ OTP MAIL SENT");
            console.log(info.messageId);

            return info;

        } catch (error) {

            console.error("❌ OTP MAIL ERROR");
            console.error(error);
            throw error;

        }

    },

    // =====================================================
    // SEND TICKET EMAIL (FIXED QR)
    // =====================================================

    sendTicketEmail: async (customerEmail, ticketData) => {

        try {

            //------------------------------------------------
            // POSTER (giữ nguyên)
            //------------------------------------------------

            const { moviePoster } = ticketData;

            const posterFile = moviePoster ? path.basename(moviePoster) : null;
            const posterPath = posterFile
                ? path.join(__dirname, "..", "uploads", "posters", posterFile)
                : null;
            const posterExists = posterPath && fs.existsSync(posterPath);

            //------------------------------------------------
            // QR CODE – tạo buffer và gán cid
            //------------------------------------------------

            const qrValue = `TICKET-${ticketData.bookingId}-${ticketData.ticketPIN}`;

            const qrBuffer = await QRCode.toBuffer(qrValue, {
                width: 280,
                margin: 2,
                errorCorrectionLevel: "H"
            });

            // Định danh để template tham chiếu
            const qrCid = "qr_img";

            //------------------------------------------------
            // ATTACHMENTS
            //------------------------------------------------

            const attachments = [];

            // Poster phim
            if (posterExists) {
                attachments.push({
                    filename: posterFile,
                    path: posterPath,
                    cid: "poster_img"
                });
            }

            // QR code (inline attachment)
            attachments.push({
                filename: "qrcode.png",
                content: qrBuffer,
                cid: qrCid,
                contentType: "image/png"
            });

            // Gửi cid cho template để sử dụng trong src="cid:..."
            ticketData.qrCid = qrCid;

            //------------------------------------------------
            // SEND MAIL
            //------------------------------------------------

            const mailOptions = {

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: customerEmail,
                subject: `[VÉ ĐIỆN TỬ] ${ticketData.movieTitle.toUpperCase()} - MÃ ĐƠN #${ticketData.bookingId}`,
                html: TicketEmailTemplate(ticketData, posterExists),
                attachments

            };

            console.log("📨 Đang gửi vé điện tử...");
            console.log("📧 To:", customerEmail);
            console.log("🎬 Movie:", ticketData.movieTitle);
            console.log("🎫 Booking:", ticketData.bookingId);
            console.log("🏠 Room:", ticketData.roomName || "Không có");

            const info = await transporter.sendMail(mailOptions);

            console.log("✅ TICKET MAIL SENT SUCCESSFULLY");
            console.log(info.messageId);

            return info;

        } catch (error) {

            console.error("❌ TICKET MAIL ERROR");
            console.error(error);
            throw error;

        }

    },

    // =====================================================
    // SEND RESET PASSWORD OTP
    // =====================================================

    sendResetPasswordOTP: async (email, otp, fullName = "") => {

        console.log(`📨 RESET PASSWORD OTP -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã OTP khôi phục mật khẩu`,
                html: ResetPasswordOtpTemplate(otp, fullName)

            });

            console.log("✅ RESET PASSWORD OTP SENT");
            return info;

        } catch (error) {

            console.error("❌ RESET PASSWORD OTP ERROR");
            console.error(error);
            throw error;

        }

    },

    // =====================================================
    // ALIAS RESET PASSWORD
    // =====================================================

    sendPasswordResetOTP: async (email, otp, fullName = "") => {
        return await MailServiceTicket.sendResetPasswordOTP(email, otp, fullName);
    },

    // =====================================================
    // SEND EMAIL VERIFICATION - 🔴 ĐÃ SỬA
    // =====================================================

    sendEmailVerification: async (email, verifyUrl, fullName = "") => {
        //                         ^^^^^^^^^^ Nhận URL trực tiếp, không phải token

        console.log(`📨 VERIFY EMAIL -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        if (!verifyUrl) {
            throw new Error("URL xác thực không hợp lệ");
        }

        try {
            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: "Xác thực Email - Dũng Cinema",
                html: VerifyEmailTemplate(fullName, verifyUrl) // ✅ Dùng URL trực tiếp

            });

            console.log("✅ VERIFY EMAIL SENT");
            console.log(`🔗 Verify URL: ${verifyUrl}`);
            return info;

        } catch (error) {

            console.error("❌ VERIFY EMAIL ERROR");
            console.error(error);
            throw error;

        }

    },

    // =====================================================
    // SEND WELCOME EMAIL
    // =====================================================

    sendWelcomeEmail: async (email, fullName = "") => {

        console.log(`📨 WELCOME EMAIL -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: "🎬 Chào mừng đến với Dũng Cinema",

                html: `
                    <div style="max-width:600px; margin:auto; padding:40px; background:#ffffff; border-radius:12px; font-family:Arial,sans-serif;">
                        <h2 style="color:#d32f2f;">Xin chào ${fullName || "bạn"} 👋</h2>
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại <b>Dũng Cinema</b>.</p>
                        <p>Chúc bạn có những trải nghiệm xem phim thật tuyệt vời cùng chúng tôi.</p>
                        <hr>
                        <p style="color:#888; font-size:13px;">© Dũng Cinema</p>
                    </div>
                `

            });

            console.log("✅ WELCOME EMAIL SENT");
            return info;

        } catch (error) {

            console.error("❌ WELCOME EMAIL ERROR");
            console.error(error);
            throw error;

        }

    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailServiceTicket;
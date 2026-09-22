// =========================================================
// IMPORTS
// =========================================================

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { transporter } = require("../Config/mailer");

const OtpEmailTemplate = require("../Templates/OtpEmailTemplate");
const TicketEmailTemplate = require("../Templates/TicketEmailTemplate");
const ForgotPasswordTemplate = require("../Templates/ForgotPasswordTemplate");
const VerifyEmailTemplate = require("../Templates/VerifyEmailTemplate");
const ForgotPinTemplate = require("../Templates/ForgotPinTemplate");
const TicketReminderTemplate = require("../Templates/TicketReminderTemplate");
const ShowtimeCancelledTemplate = require("../Templates/ShowtimeCancelledTemplate");
const ShowtimeChangedTemplate = require("../Templates/ShowtimeChangedTemplate");

// =========================================================
// HÀM LẤY THỜI GIAN VN (UTC+7)
// =========================================================
const getVNTime = (addMinutes = 0) => {
    const now = new Date(Date.now() + addMinutes * 60 * 1000);
    return {
        timestamp: now.getTime(),
        display: now.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh"
        })
    };
};

// =========================================================
// MAIL SERVICE
// =========================================================

const MailService = {

    /* =========================================================
       ✅ SEND TICKET EMAIL — CÓ POSTER
    ========================================================= */
    sendTicketEmail: async (data) => {
        const {
            email, bookingId, customerName, seatLabel, movieTitle,
            moviePoster,        // ✅ THÊM DÒNG NÀY
            cinemaName, roomName, startTime, selectedDate, selectedFoods,
            earnedPoints = 0, ticketPIN, ticketCode, qrUrl, posterPath,
        } = data || {};

        console.log(`📨 [MAIL] SEND TICKET -> ${email} | Booking: ${bookingId}`);
        console.log(`🖼️ [MAIL] moviePoster: ${moviePoster}`);

        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];
            const qrContent = qrUrl || ticketCode || ticketPIN;
            let qrCid = null;

            if (qrContent) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qrContent, {
                        width: 500, margin: 4, errorCorrectionLevel: "H",
                        color: { dark: "#000000", light: "#FFFFFF" },
                    });
                    qrCid = "qr_img";
                    attachments.push({
                        filename: `qr-ticket-${bookingId}.png`,
                        content: qrBuffer, cid: qrCid, contentType: "image/png",
                    });
                } catch (qrError) {
                    console.error("❌ [MAIL] QR code generation error:", qrError.message);
                }
            }

            let fileExists = false;
            if (posterPath && fs.existsSync(posterPath)) {
                try {
                    attachments.push({
                        filename: path.basename(posterPath),
                        path: posterPath, cid: "poster_img", contentType: "image/png",
                    });
                    fileExists = true;
                } catch (posterError) {
                    console.error("❌ [MAIL] Poster attach error:", posterError.message);
                }
            }

            const templateData = {
                bookingId, customerName: customerName || "Quý khách",
                seatLabel: seatLabel || "---", movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",        // ✅ TRUYỀN VÀO TEMPLATE
                cinemaName: cinemaName || "---", roomName: roomName || "---",
                startTime: startTime || "---", selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "", earnedPoints: earnedPoints || 0,
                ticketPIN: ticketPIN || ticketCode || "", qrCid: qrCid,
            };

            const html = TicketEmailTemplate(templateData, fileExists);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `🎬 Vé xem phim "${movieTitle}" — Booking #${bookingId}`,
                html, attachments,
            });

            console.log("✅ [MAIL] TICKET EMAIL SENT");
            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET EMAIL ERROR");
            throw error;
        }
    },

    sendPaymentOTP: async (email, otp, bookingId) => {
        console.log(`📨 SEND PAYMENT OTP -> ${email} | Booking: ${bookingId}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const expiresAt = getVNTime(5);
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Dũng Cinema`,
                html: OtpEmailTemplate(otp, bookingId, expiresAt.display)
            });
            console.log("✅ PAYMENT OTP MAIL SENT");
            return info;
        } catch (error) {
            console.error("❌ PAYMENT OTP MAIL ERROR");
            throw error;
        }
    },

    sendOTP: async (email, otp, bookingId) => {
        return await MailService.sendPaymentOTP(email, otp, bookingId);
    },

    sendResetPasswordOTP: async (email, otp, fullName = "") => {
        console.log(`📨 RESET PASSWORD OTP -> ${email}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const expiresAt = getVNTime(5);
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã OTP đặt lại mật khẩu`,
                html: ForgotPasswordTemplate(otp, fullName, expiresAt.display)
            });
            console.log("✅ RESET PASSWORD OTP SENT");
            return info;
        } catch (error) {
            console.error("❌ RESET PASSWORD OTP ERROR");
            throw error;
        }
    },

    sendForgotPinOTP: async (email, otp, fullName = "") => {
        console.log(`📨 SEND FORGOT PIN OTP -> ${email}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const expiresAt = getVNTime(5);
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực đặt lại mã PIN`,
                html: ForgotPinTemplate(otp, fullName, expiresAt.display)
            });
            console.log("✅ FORGOT PIN OTP SENT");
            return info;
        } catch (error) {
            console.error("❌ FORGOT PIN OTP ERROR");
            throw error;
        }
    },

    sendEmailVerification: async (email, verifyUrl, fullName = "") => {
        console.log(`📨 SEND VERIFY EMAIL -> ${email}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `Xác thực email của bạn — Dũng Cinema`,
                html: VerifyEmailTemplate(verifyUrl, fullName)
            });
            console.log("✅ VERIFY EMAIL SENT");
            return info;
        } catch (error) {
            console.error("❌ VERIFY EMAIL ERROR");
            throw error;
        }
    },

    sendTicketReminder: async (data) => {
        const {
            email, bookingId, customerName, seatLabel, movieTitle,
            moviePoster, cinemaName, cinemaAddress, cinemaMap,
            roomName, startTime, selectedDate, selectedFoods,
            ticketPIN, ticketCode, qrUrl, minutesBefore = 30,
        } = data || {};

        console.log(`📨 [MAIL] SEND TICKET REMINDER -> ${email} | Booking: ${bookingId}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];
            const qrContent = qrUrl || ticketCode || ticketPIN;
            let qrCid = null;

            if (qrContent) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qrContent, {
                        width: 500, margin: 4, errorCorrectionLevel: "H",
                        color: { dark: "#000000", light: "#FFFFFF" },
                    });
                    qrCid = "qr_img";
                    attachments.push({
                        filename: `qr-reminder-${bookingId}.png`,
                        content: qrBuffer, cid: qrCid, contentType: "image/png",
                    });
                } catch (qrError) {
                    console.error("❌ [MAIL] QR code generation error:", qrError.message);
                }
            }

            const templateData = {
                bookingId, customerName: customerName || "Quý khách",
                seatLabel: seatLabel || "---", movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "", cinemaName: cinemaName || "---",
                cinemaAddress: cinemaAddress || "", cinemaMap: cinemaMap || "",
                roomName: roomName || "---", startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid: qrCid, minutesBefore: minutesBefore,
            };

            const html = TicketReminderTemplate(templateData);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `⏰ Nhắc nhở: "${movieTitle}" sẽ bắt đầu sau ${minutesBefore} phút`,
                html, attachments,
            });

            console.log("✅ [MAIL] TICKET REMINDER SENT");
            return info;
        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET REMINDER ERROR");
            throw error;
        }
    },

    sendShowtimeCancelledEmail: async (data) => {
        const {
            email, customerName, movieTitle, moviePoster,
            cinemaName, roomName, startTime, reason,
            refundPoints = 0, newTotalPoints = 0,
            rescheduleLink = '', expiresAt = null,
        } = data || {};

        console.log(`📨 [MAIL] SEND SHOWTIME CANCELLED -> ${email} | Movie: ${movieTitle} | Refund: ${refundPoints} points`);

        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const templateData = {
                customerName: customerName || "Quý khách",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                reason: reason || "Sự cố kỹ thuật",
                refundPoints: refundPoints,
                newTotalPoints: newTotalPoints,
                rescheduleLink: rescheduleLink,
                expiresAt: expiresAt,
            };

            const html = ShowtimeCancelledTemplate(templateData);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `⚠️ Suất chiếu "${movieTitle}" đã bị hủy — Hoàn ${Number(refundPoints).toLocaleString('vi-VN')} điểm`,
                html,
            });

            console.log("✅ [MAIL] SHOWTIME CANCELLED EMAIL SENT");
            return info;
        } catch (error) {
            console.error("❌ [MAIL] SEND SHOWTIME CANCELLED ERROR");
            throw error;
        }
    },

    /* =====================================================
       ✅ SEND SHOWTIME CHANGED EMAIL — CÓ POSTER + QR
    ===================================================== */
    sendShowtimeChangedEmail: async (data) => {
        const {
            email,
            customerName,
            movieTitle,
            moviePoster,
            oldInfo = {},
            newInfo = {},
            reason,

            // ✅ THÔNG TIN VÉ
            bookingId,
            seatLabel,
            cinemaName,
            roomName,
            startTime,
            selectedDate,
            selectedFoods,
            earnedPoints = 0,
            ticketPIN,
            ticketCode,
            qrUrl,
        } = data || {};

        console.log(`📨 [MAIL] SEND SHOWTIME CHANGED -> ${email} | Movie: ${movieTitle}`);
        console.log(`🖼️ [MAIL] moviePoster: ${moviePoster}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {
            // ✅ Generate QR code
            const attachments = [];
            const qrContent = qrUrl || ticketCode || ticketPIN;
            let qrCid = null;

            if (qrContent) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qrContent, {
                        width: 500, margin: 4, errorCorrectionLevel: "H",
                        color: { dark: "#000000", light: "#FFFFFF" },
                    });
                    qrCid = "qr_img";
                    attachments.push({
                        filename: `qr-ticket-${bookingId}.png`,
                        content: qrBuffer, cid: qrCid, contentType: "image/png",
                    });
                } catch (qrError) {
                    console.error("❌ [MAIL] QR code generation error:", qrError.message);
                }
            }

            const templateData = {
                customerName: customerName || "Quý khách",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                oldInfo: oldInfo,
                newInfo: newInfo,
                reason: reason || "",

                // ✅ THÔNG TIN VÉ
                bookingId,
                seatLabel: seatLabel || "---",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                earnedPoints: earnedPoints || 0,
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid: qrCid,
            };

            const html = ShowtimeChangedTemplate(templateData);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `🔄 Suất chiếu "${movieTitle}" của bạn đã thay đổi`,
                html,
                attachments,   // ✅ gửi kèm QR
            });

            console.log("✅ [MAIL] SHOWTIME CHANGED EMAIL SENT");
            console.log(`📧 Message ID: ${info.messageId}`);

            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND SHOWTIME CHANGED ERROR");
            console.error(error);
            throw error;
        }
    },
};

module.exports = MailService;
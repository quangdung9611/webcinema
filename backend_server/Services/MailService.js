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

    // =====================================================
    // ✅ SEND TICKET EMAIL — GỬI VÉ VỀ EMAIL
    // =====================================================

    sendTicketEmail: async (data) => {
        const {
            email,
            bookingId,
            customerName,
            seatLabel,
            movieTitle,
            cinemaName,
            roomName,
            startTime,
            selectedDate,
            selectedFoods,
            earnedPoints = 0,
            ticketPIN,
            ticketCode,
            qrUrl,
            posterPath,
        } = data || {};

        console.log(`📨 [MAIL] SEND TICKET -> ${email} | Booking: ${bookingId}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {
            const attachments = [];

            // ----- QR CODE -----
            const qrContent = qrUrl || ticketCode || ticketPIN;
            let qrCid = null;

            if (qrContent) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qrContent, {
                        width: 500,
                        margin: 4,
                        errorCorrectionLevel: "H",
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF",
                        },
                    });

                    qrCid = "qr_img";

                    attachments.push({
                        filename: `qr-ticket-${bookingId}.png`,
                        content: qrBuffer,
                        cid: qrCid,
                        contentType: "image/png",
                    });

                    console.log(`✅ [MAIL] QR code attached (cid: ${qrCid})`);
                } catch (qrError) {
                    console.error("❌ [MAIL] QR code generation error:", qrError.message);
                }
            } else {
                console.warn("⚠️ [MAIL] No QR content — QR code skipped");
            }

            // ----- POSTER (OPTIONAL) -----
            let fileExists = false;

            if (posterPath && fs.existsSync(posterPath)) {
                try {
                    attachments.push({
                        filename: path.basename(posterPath),
                        path: posterPath,
                        cid: "poster_img",
                        contentType: "image/png",
                    });

                    fileExists = true;
                    console.log(`✅ [MAIL] Poster attached (cid: poster_img)`);
                } catch (posterError) {
                    console.error("❌ [MAIL] Poster attach error:", posterError.message);
                }
            } else {
                console.log("ℹ️ [MAIL] No poster — skipped");
            }

            const templateData = {
                bookingId,
                customerName: customerName || "Quý khách",
                seatLabel: seatLabel || "---",
                movieTitle: movieTitle || "---",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                earnedPoints: earnedPoints || 0,
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid: qrCid,
            };

            const html = TicketEmailTemplate(templateData, fileExists);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `🎬 Vé xem phim "${movieTitle}" — Booking #${bookingId}`,
                html,
                attachments,
            });

            console.log("✅ [MAIL] TICKET EMAIL SENT");
            console.log(`📧 Message ID: ${info.messageId}`);

            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET EMAIL ERROR");
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // SEND PAYMENT OTP
    // =====================================================

    sendPaymentOTP: async (email, otp, bookingId) => {
        console.log(`📨 SEND PAYMENT OTP -> ${email} | Booking: ${bookingId}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {
            const expiresAt = getVNTime(5);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Dũng Cinema`,
                html: OtpEmailTemplate(otp, bookingId, expiresAt.display)
            });

            console.log("✅ PAYMENT OTP MAIL SENT");
            console.log(info.messageId);

            return info;

        } catch (error) {
            console.error("❌ PAYMENT OTP MAIL ERROR");
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // ALIAS
    // =====================================================

    sendOTP: async (email, otp, bookingId) => {
        return await MailService.sendPaymentOTP(email, otp, bookingId);
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
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // SEND FORGOT PIN OTP
    // =====================================================

    sendForgotPinOTP: async (email, otp, fullName = "") => {
        console.log(`📨 SEND FORGOT PIN OTP -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {
            const expiresAt = getVNTime(5);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực đặt lại mã PIN`,
                html: ForgotPinTemplate(otp, fullName, expiresAt.display)
            });

            console.log("✅ FORGOT PIN OTP SENT");
            console.log(info.messageId);

            return info;

        } catch (error) {
            console.error("❌ FORGOT PIN OTP ERROR");
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // SEND VERIFY EMAIL
    // =====================================================

    sendEmailVerification: async (email, verifyUrl, fullName = "") => {
        console.log(`📨 SEND VERIFY EMAIL -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

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
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // ✅ SEND TICKET REMINDER — GỬI NHẮC NHỞ SUẤT CHIẾU
    // =====================================================

    sendTicketReminder: async (data) => {
        const {
            email,
            bookingId,
            customerName,
            seatLabel,
            movieTitle,
            moviePoster,
            cinemaName,
            cinemaAddress,
            cinemaMap,
            roomName,
            startTime,
            selectedDate,
            selectedFoods,
            ticketPIN,
            ticketCode,
            qrUrl,
            minutesBefore = 30,
        } = data || {};

        console.log(`📨 [MAIL] SEND TICKET REMINDER -> ${email} | Booking: ${bookingId}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {
            const attachments = [];
            const qrContent = qrUrl || ticketCode || ticketPIN;
            let qrCid = null;

            if (qrContent) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qrContent, {
                        width: 500,
                        margin: 4,
                        errorCorrectionLevel: "H",
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF",
                        },
                    });

                    qrCid = "qr_img";

                    attachments.push({
                        filename: `qr-reminder-${bookingId}.png`,
                        content: qrBuffer,
                        cid: qrCid,
                        contentType: "image/png",
                    });

                    console.log(`✅ [MAIL] QR code attached (cid: ${qrCid})`);
                } catch (qrError) {
                    console.error("❌ [MAIL] QR code generation error:", qrError.message);
                }
            }

            const templateData = {
                bookingId,
                customerName: customerName || "Quý khách",
                seatLabel: seatLabel || "---",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                cinemaName: cinemaName || "---",
                cinemaAddress: cinemaAddress || "",
                cinemaMap: cinemaMap || "",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid: qrCid,
                minutesBefore: minutesBefore,
            };

            const html = TicketReminderTemplate(templateData);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `⏰ Nhắc nhở: "${movieTitle}" sẽ bắt đầu sau ${minutesBefore} phút`,
                html,
                attachments,
            });

            console.log("✅ [MAIL] TICKET REMINDER SENT");
            console.log(`📧 Message ID: ${info.messageId}`);

            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET REMINDER ERROR");
            console.error(error);
            throw error;
        }
    },

    // =====================================================
    // ✅ SEND SHOWTIME CANCELLED EMAIL — THÔNG BÁO HỦY + HOÀN ĐIỂM
    // =====================================================

    sendShowtimeCancelledEmail: async (data) => {
        const {
            email,
            customerName,
            movieTitle,
            moviePoster,
            cinemaName,
            roomName,
            startTime,
            reason,
            refundPoints = 0,
            newTotalPoints = 0,
        } = data || {};

        console.log(`📨 [MAIL] SEND SHOWTIME CANCELLED -> ${email} | Movie: ${movieTitle} | Refund: ${refundPoints} points`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

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
            };

            const html = ShowtimeCancelledTemplate(templateData);

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `⚠️ Suất chiếu "${movieTitle}" đã bị hủy — Hoàn ${Number(refundPoints).toLocaleString('vi-VN')} điểm`,
                html,
            });

            console.log("✅ [MAIL] SHOWTIME CANCELLED EMAIL SENT");
            console.log(`📧 Message ID: ${info.messageId}`);

            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND SHOWTIME CANCELLED ERROR");
            console.error(error);
            throw error;
        }
    },
};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailService;
// Services/MailService.js

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
const RescheduleSuccessTemplate = require("../Templates/RescheduleSuccessTemplate");

/* =========================================================
   CONFIG — URL FRONTEND
========================================================= */
const FRONTEND_URL = process.env.FRONTEND_URL || "https://quangdungcinema.id.vn";

/* =========================================================
   HELPER: LẤY THỜI GIAN VN (UTC+7)
========================================================= */
const getVNTime = (addMinutes = 0) => {
    const now = new Date(Date.now() + addMinutes * 60 * 1000);
    return {
        timestamp: now.getTime(),
        display: now.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh",
        }),
    };
};

/* =========================================================
   HELPER: TẠO QR BUFFER + ATTACHMENT
========================================================= */
const generateQRAttachment = async (content, bookingId, prefix = "qr") => {
    if (!content) return { qrCid: null, attachment: null };

    try {
        const qrBuffer = await QRCode.toBuffer(content, {
            width: 500,
            margin: 4,
            errorCorrectionLevel: "H",
            color: { dark: "#000000", light: "#FFFFFF" },
        });

        const qrCid = "qr_img";
        const attachment = {
            filename: `${prefix}-${bookingId}.png`,
            content: qrBuffer,
            cid: qrCid,
            contentType: "image/png",
        };

        return { qrCid, attachment };
    } catch (err) {
        console.error("❌ [MAIL] QR generation error:", err.message);
        return { qrCid: null, attachment: null };
    }
};

/* =========================================================
   MAIL SERVICE
========================================================= */
const MailService = {

    /* =========================================================
       ✅ SEND TICKET EMAIL — XÁC NHẬN ĐẶT VÉ
    ========================================================= */
    sendTicketEmail: async (data) => {
        const {
            email,
            bookingId,
            customerName,
            seatLabel,
            movieTitle,
            moviePoster,
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
        console.log(`🖼️ [MAIL] moviePoster: ${moviePoster}`);

        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];

            // ✅ QR
            const qrContent = qrUrl || ticketCode || ticketPIN;
            const { qrCid, attachment: qrAttach } = await generateQRAttachment(
                qrContent,
                bookingId,
                "qr-ticket"
            );
            if (qrAttach) attachments.push(qrAttach);

            // ✅ POSTER LOCAL (nếu có)
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
                } catch (err) {
                    console.error("❌ [MAIL] Poster attach error:", err.message);
                }
            }

            // ✅ DATA CHO TEMPLATE
            const templateData = {
                bookingId,
                customerName: customerName || "Quý khách",
                seatLabel: seatLabel || "---",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                earnedPoints: earnedPoints || 0,
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid: qrCid,
                // ✅ Link hành động
                downloadUrl: `${FRONTEND_URL}/confirm-success?orderId=${bookingId}`,
                homeUrl: FRONTEND_URL,
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
            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET EMAIL ERROR:", error);
            throw error;
        }
    },

    /* =========================================================
       ✅ SEND TICKET REMINDER — NHẮC NHỞ SUẤT CHIẾU
    ========================================================= */
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
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];

            // ✅ QR
            const qrContent = qrUrl || ticketCode || ticketPIN;
            const { qrCid, attachment: qrAttach } = await generateQRAttachment(
                qrContent,
                bookingId,
                "qr-reminder"
            );
            if (qrAttach) attachments.push(qrAttach);

            // ✅ DATA CHO TEMPLATE
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
                // ✅ Link hành động
                downloadUrl: `${FRONTEND_URL}/confirm-success?orderId=${bookingId}`,
                homeUrl: FRONTEND_URL,
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
            return info;

        } catch (error) {
            console.error("❌ [MAIL] SEND TICKET REMINDER ERROR:", error);
            throw error;
        }
    },

    /* =========================================================
       OTP & AUTH EMAILS (giữ nguyên)
    ========================================================= */
    sendPaymentOTP: async (email, otp, bookingId) => {
        console.log(`📨 SEND PAYMENT OTP -> ${email} | Booking: ${bookingId}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const expiresAt = getVNTime(5);
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Dũng Cinema`,
                html: OtpEmailTemplate(otp, bookingId, expiresAt.display),
            });
            console.log("✅ PAYMENT OTP MAIL SENT");
            return info;
        } catch (error) {
            console.error("❌ PAYMENT OTP MAIL ERROR:", error);
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
                html: ForgotPasswordTemplate(otp, fullName, expiresAt.display),
            });
            console.log("✅ RESET PASSWORD OTP SENT");
            return info;
        } catch (error) {
            console.error("❌ RESET PASSWORD OTP ERROR:", error);
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
                html: ForgotPinTemplate(otp, fullName, expiresAt.display),
            });
            console.log("✅ FORGOT PIN OTP SENT");
            return info;
        } catch (error) {
            console.error("❌ FORGOT PIN OTP ERROR:", error);
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
                html: VerifyEmailTemplate(verifyUrl, fullName),
            });
            console.log("✅ VERIFY EMAIL SENT");
            return info;
        } catch (error) {
            console.error("❌ VERIFY EMAIL ERROR:", error);
            throw error;
        }
    },

    /* =========================================================
       SHOWTIME CANCELLED
    ========================================================= */
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
            rescheduleLink = "",
            expiresAt = null,
        } = data || {};

        console.log(`📨 [MAIL] SHOWTIME CANCELLED -> ${email}`);
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
                refundPoints,
                newTotalPoints,
                rescheduleLink,
                expiresAt,
            };

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `⚠️ Suất chiếu "${movieTitle}" đã bị hủy — Hoàn ${Number(refundPoints).toLocaleString("vi-VN")} điểm`,
                html: ShowtimeCancelledTemplate(templateData),
            });

            console.log("✅ [MAIL] SHOWTIME CANCELLED SENT");
            return info;
        } catch (error) {
            console.error("❌ [MAIL] SHOWTIME CANCELLED ERROR:", error);
            throw error;
        }
    },

    /* =========================================================
       SHOWTIME CHANGED
    ========================================================= */
    sendShowtimeChangedEmail: async (data) => {
        const {
            email,
            customerName,
            movieTitle,
            moviePoster,
            oldInfo = {},
            newInfo = {},
            reason,
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

        console.log(`📨 [MAIL] SHOWTIME CHANGED -> ${email} | Movie: ${movieTitle}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];

            const qrContent = qrUrl || ticketCode || ticketPIN;
            const { qrCid, attachment: qrAttach } = await generateQRAttachment(
                qrContent,
                bookingId,
                "qr-changed"
            );
            if (qrAttach) attachments.push(qrAttach);

            const templateData = {
                customerName: customerName || "Quý khách",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                oldInfo,
                newInfo,
                reason: reason || "",
                bookingId,
                seatLabel: seatLabel || "---",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                earnedPoints: earnedPoints || 0,
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid,
            };

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `🔄 Suất chiếu "${movieTitle}" của bạn đã thay đổi`,
                html: ShowtimeChangedTemplate(templateData),
                attachments,
            });

            console.log("✅ [MAIL] SHOWTIME CHANGED SENT");
            return info;
        } catch (error) {
            console.error("❌ [MAIL] SHOWTIME CHANGED ERROR:", error);
            throw error;
        }
    },

    /* =========================================================
       RESCHEDULE SUCCESS
    ========================================================= */
    sendRescheduleSuccessEmail: async (data) => {
        const {
            email,
            customerName,
            movieTitle,
            moviePoster,
            oldInfo = {},
            newInfo = {},
            priceDifference = 0,
            newTotalAmount = 0,
            bookingId,
            seatLabel,
            cinemaName,
            roomName,
            startTime,
            selectedDate,
            selectedFoods,
            ticketPIN,
            ticketCode,
            qrUrl,
        } = data || {};

        console.log(`📨 [MAIL] RESCHEDULE SUCCESS -> ${email} | Booking: ${bookingId}`);
        if (!email) throw new Error("Email người nhận không hợp lệ");

        try {
            const attachments = [];

            const qrContent = qrUrl || ticketCode || ticketPIN;
            const { qrCid, attachment: qrAttach } = await generateQRAttachment(
                qrContent,
                bookingId,
                "qr-reschedule"
            );
            if (qrAttach) attachments.push(qrAttach);

            const templateData = {
                customerName: customerName || "Quý khách",
                movieTitle: movieTitle || "---",
                moviePoster: moviePoster || "",
                oldInfo,
                newInfo,
                priceDifference,
                newTotalAmount,
                bookingId,
                seatLabel: seatLabel || "---",
                cinemaName: cinemaName || "---",
                roomName: roomName || "---",
                startTime: startTime || "---",
                selectedDate: selectedDate || "---",
                selectedFoods: selectedFoods || "",
                ticketPIN: ticketPIN || ticketCode || "",
                qrCid,
            };

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `✅ Đổi suất chiếu thành công — "${movieTitle}"`,
                html: RescheduleSuccessTemplate(templateData),
                attachments,
            });

            console.log("✅ [MAIL] RESCHEDULE SUCCESS SENT");
            return info;
        } catch (error) {
            console.error("❌ [MAIL] RESCHEDULE SUCCESS ERROR:", error);
            throw error;
        }
    },
};

module.exports = MailService;
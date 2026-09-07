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

// =========================================================
// HÀM LẤY THỜI GIAN VN (UTC+7) - ĐỂ HIỂN THỊ ĐÚNG GIỜ
// =========================================================
const getVNTime = (addMinutes = 0) => {
    const now = new Date(Date.now() + addMinutes * 60 * 1000);
    return now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh"
    });
};

// =========================================================
// MAIL SERVICE
// =========================================================

const MailService = {

    // =====================================================
    // ✅ SEND PAYMENT OTP - GỬI OTP THANH TOÁN
    // =====================================================

    sendPaymentOTP: async (email, otp, bookingId) => {

        console.log(`📨 SEND PAYMENT OTP -> ${email} | Booking: ${bookingId}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            // ⏰ Thời gian hết hạn là 5 phút nữa tính từ bây giờ
            const expiresAt = getVNTime(5);

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Dũng Cinema`,
                html: OtpEmailTemplate(otp, bookingId, expiresAt) // 👈 Truyền giờ hết hạn

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
    // ⚠️ ALIAS - GIỮ TÊN CŨ CHO TƯƠNG THÍCH NGƯỢC
    // =====================================================

    sendOTP: async (email, otp, bookingId) => {
        return await MailService.sendPaymentOTP(email, otp, bookingId);
    },

    // =====================================================
    // SEND RESET PASSWORD OTP - DÙNG CHO FORGOT PASSWORD
    // =====================================================

    sendResetPasswordOTP: async (email, otp, fullName = "") => {

        console.log(`📨 RESET PASSWORD OTP -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            // ⏰ Thời gian hết hạn là 5 phút nữa tính từ bây giờ
            const expiresAt = getVNTime(5);

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã OTP đặt lại mật khẩu`,
                html: ForgotPasswordTemplate(otp, fullName, expiresAt) // 👈 Truyền giờ hết hạn

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
    // SEND FORGOT PIN OTP (GỬI OTP ĐẶT LẠI MÃ PIN)
    // =====================================================

    sendForgotPinOTP: async (email, otp, fullName = "") => {

        console.log(`📨 SEND FORGOT PIN OTP -> ${email}`);

        if (!email) {
            throw new Error("Email người nhận không hợp lệ");
        }

        try {

            // ⏰ Thời gian hết hạn là 5 phút nữa tính từ bây giờ
            const expiresAt = getVNTime(5);

            const info = await transporter.sendMail({

                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực đặt lại mã PIN`,
                html: ForgotPinTemplate(otp, fullName, expiresAt) // 👈 Truyền giờ hết hạn

            });

            console.log("✅ FORGOT PIN OTP SENT");
            console.log(info.messageId);

            return info;

        } catch (error) {

            console.error("❌ FORGOT PIN OTP ERROR");
            console.error(error);
            throw error;

        }

    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailService;
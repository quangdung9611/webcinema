// =========================================================
// IMPORTS
// =========================================================

const path = require('path');
const fs = require('fs');

// ✅ Mới: Lấy đúng transporter từ mailer
const { transporter, sendMailWithRetry } = require('../Config/mailer'); // ← SỬA DÒNG NÀY

const OtpEmailTemplate = require('../Templates/OtpEmailTemplate');
const TicketEmailTemplate = require('../Templates/TicketEmailTemplate');
const ResetPasswordOtpTemplate = require('../Templates/ResetPasswordOtpTemplate');
const VerifyEmailTemplate = require('../Templates/VerifyEmailTemplate'); // ← Tạo mới

// =========================================================
// MAIL SERVICE
// =========================================================

const MailServiceTicket = {

    // =====================================================
    // SEND PAYMENT OTP
    // =====================================================

    sendOTP: async (email, otp, bookingId) => {
        console.log(`DEBUG: Nhận yêu cầu gửi OTP tới: ${email}, OTP: ${otp}, BookingID: ${bookingId}`);

        if (!email) {
            console.error("❌ LỖI: Email người nhận bị trống!");
            return;
        }

        try {
            console.log('📨 Đang chuẩn bị gửi OTP mail...');

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Cinema Star`,
                html: OtpEmailTemplate(otp, bookingId)
            });

            console.log('✅ OTP MAIL SENT SUCCESSFULLY');
            console.log(info);
            return info;

        } catch (err) {
            console.log('❌ OTP MAIL ERROR');
            console.log(err);
            throw err;
        }
    },

    // =====================================================
    // SEND TICKET EMAIL
    // =====================================================

    sendTicketEmail: async (customerEmail, ticketData) => {
        try {
            const { moviePoster } = ticketData;
            const fileName = moviePoster ? path.basename(moviePoster) : null;
            const absolutePath = fileName ? path.join(__dirname, '..', 'uploads', 'posters', fileName) : null;
            const fileExists = absolutePath && fs.existsSync(absolutePath);

            console.log({ fileName, absolutePath, fileExists });

            const mailOptions = {
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: customerEmail,
                subject: `[VÉ ĐIỆN TỬ] ${ticketData.movieTitle?.toUpperCase()} - MÃ ĐƠN #${ticketData.bookingId}`,
                html: TicketEmailTemplate(ticketData, fileExists),
                attachments: fileExists ? [{
                    filename: fileName,
                    path: absolutePath,
                    cid: 'poster_img'
                }] : []
            };

            console.log('📨 Đang gửi vé điện tử...');
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ TICKET MAIL SENT SUCCESSFULLY');
            console.log(info);
            return info;

        } catch (err) {
            console.log('❌ TICKET MAIL ERROR');
            console.log(err);
            throw err;
        }
    },

    // =====================================================
    // SEND RESET PASSWORD OTP (Dùng cho forgotPassword)
    // =====================================================

    sendResetPasswordOTP: async (email, otp, fullName = '') => {
        console.log(`DEBUG: Nhận yêu cầu gửi RESET OTP tới: ${email}, OTP: ${otp}`);

        if (!email) {
            console.error("❌ LỖI: Email người nhận bị trống!");
            return;
        }

        try {
            console.log('📨 Đang chuẩn bị gửi RESET OTP mail...');

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `[${otp}] Mã OTP khôi phục mật khẩu`,
                html: ResetPasswordOtpTemplate(otp, fullName)
            });

            console.log('✅ RESET OTP MAIL SENT SUCCESSFULLY');
            console.log(info);
            return info;

        } catch (err) {
            console.log('❌ RESET OTP MAIL ERROR');
            console.log(err);
            throw err;
        }
    },

    // =====================================================
    // SEND PASSWORD RESET OTP (Alias - Dùng trong AuthService)
    // =====================================================

    sendPasswordResetOTP: async (email, otp, fullName = '') => {
        return await MailServiceTicket.sendResetPasswordOTP(email, otp, fullName);
    },

    // =====================================================
    // SEND EMAIL VERIFICATION
    // =====================================================

    sendEmailVerification: async (email, verifyToken, fullName = '') => {
        console.log(`DEBUG: Nhận yêu cầu gửi VERIFY EMAIL tới: ${email}`);

        if (!email) {
            console.error("❌ LỖI: Email người nhận bị trống!");
            return;
        }

        try {
            // Lấy base URL từ env
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;

            console.log('📨 Đang chuẩn bị gửi VERIFY EMAIL mail...');

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `Xác thực email - Dũng Cinema`,
                html: VerifyEmailTemplate(fullName, verifyUrl)
            });

            console.log('✅ VERIFY EMAIL SENT SUCCESSFULLY');
            console.log(info);
            return info;

        } catch (err) {
            console.log('❌ VERIFY EMAIL ERROR');
            console.log(err);
            throw err;
        }
    },

    // =====================================================
    // SEND WELCOME EMAIL (Optional)
    // =====================================================

    sendWelcomeEmail: async (email, fullName = '') => {
        console.log(`DEBUG: Nhận yêu cầu gửi WELCOME EMAIL tới: ${email}`);

        if (!email) {
            console.error("❌ LỖI: Email người nhận bị trống!");
            return;
        }

        try {
            console.log('📨 Đang chuẩn bị gửi WELCOME EMAIL mail...');

            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <no-reply@quangdungcinema.id.vn>`,
                to: email,
                subject: `Chào mừng đến với Dũng Cinema! 🎬`,
                html: `<h1>Chào ${fullName || 'bạn'}!</h1>
                       <p>Cảm ơn bạn đã đăng ký tài khoản tại Dũng Cinema.</p>
                       <p>Chúc bạn có những trải nghiệm tuyệt vời!</p>
                       <p>🎬 Dũng Cinema Team</p>`
            });

            console.log('✅ WELCOME EMAIL SENT SUCCESSFULLY');
            console.log(info);
            return info;

        } catch (err) {
            console.log('❌ WELCOME EMAIL ERROR');
            console.log(err);
            throw err;
        }
    }

};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailServiceTicket;
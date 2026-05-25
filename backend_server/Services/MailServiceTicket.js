// =========================================================
// IMPORTS
// =========================================================

const path = require('path');
const fs = require('fs');
const transporter = require('../Config/mailer');
const OtpEmailTemplate = require('../Templates/OtpEmailTemplate');
const TicketEmailTemplate = require('../Templates/TicketEmailTemplate');

// =========================================================
// MAIL SERVICE
// =========================================================

const MailServiceTicket = {

    // =====================================================
    // SEND PAYMENT OTP
    // =====================================================

    sendOTP: async (email, otp, bookingId) => {
        // DEBUG: Kiểm tra biến môi trường và yêu cầu đầu vào
        console.log(`DEBUG: EMAIL_USER đang dùng là: ${process.env.EMAIL_USER}`);
        console.log(`DEBUG: Nhận yêu cầu gửi OTP tới: ${email}, OTP: ${otp}, BookingID: ${bookingId}`);

        if (!email) {
            console.error("❌ LỖI: Email người nhận bị trống!");
            return;
        }
        
        try {
            console.log('DEBUG: Đang chuẩn bị gửi mail OTP...');
            const info = await transporter.sendMail({
                from: `"Dũng Cinema 🍿" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Cinema Star`,
                html: OtpEmailTemplate(otp, bookingId)
            });
            console.log('✅ OTP MAIL SENT');
            return info;
        } catch (err) {
            // DEBUG: In chi tiết lỗi để biết tại sao bị ETIMEDOUT
            console.error('❌ OTP MAIL ERROR (Chi tiết lỗi):', err.code, err.message);
            throw err;
        }
    },

    // =====================================================
    // SEND TICKET EMAIL
    // =====================================================

    sendTicketEmail: async (customerEmail, ticketData) => {
        try {
            console.log(`DEBUG: Đang thực hiện sendTicketEmail tới: ${customerEmail}`);

            // =================================================
            // GET POSTER
            // =================================================

            const { moviePoster } = ticketData;

            // =================================================
            // FILE NAME
            // =================================================

            const fileName = moviePoster ? path.basename(moviePoster) : null;

            // =================================================
            // ABSOLUTE PATH
            // =================================================

            const absolutePath = fileName ? path.join(__dirname, '..', 'uploads', 'posters', fileName) : null;

            // =================================================
            // CHECK FILE EXISTS
            // =================================================

            const fileExists = absolutePath && fs.existsSync(absolutePath);

            console.log('DEBUG: File thông tin:', {
                fileName,
                absolutePath,
                fileExists
            });

            // =================================================
            // MAIL OPTIONS
            // =================================================

            const mailOptions = {
                from: `"Dũng Cinema 🍿" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `[VÉ ĐIỆN TỬ] ${ticketData.movieTitle?.toUpperCase()} - MÃ ĐƠN #${ticketData.bookingId}`,
                html: TicketEmailTemplate(ticketData, fileExists),
                attachments: []
            };

            // =================================================
            // SEND MAIL
            // =================================================

            console.log('DEBUG: Đang gọi transporter.sendMail (Ticket)...');
            const info = await transporter.sendMail(mailOptions);
            
            console.log('✅ TICKET MAIL SENT');
            console.log('DEBUG: Thông tin phản hồi từ Server Mail:', info);
            
            return info;
        }
        catch (err) {
            console.error('❌ TICKET MAIL ERROR (Chi tiết lỗi):', err.code, err.message);
            throw err;
        }
    }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = MailServiceTicket;
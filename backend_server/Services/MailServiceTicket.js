const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nguyenphamquangdung9611@gmail.com', //
        pass: 'gezt gsvc gpdn rqfc' //
    }
});

const MailServiceTicket = {
    // Gửi mã OTP thanh toán
    sendOTP: async (email, otp, bookingId) => {
        return transporter.sendMail({
            from: '"Dũng Cinema 🍿" <nguyenphamquangdung9611@gmail.com>',
            to: email,
            subject: `[${otp}] Mã xác thực thanh toán Cinema Star`,
            html: `
                <div style="text-align:center; font-family: sans-serif;">
                    <h2>Mã OTP của ông là: <span style="color:red; font-size: 30px;">${otp}</span></h2>
                    <p>Mã này có hiệu lực trong <b>5 phút</b> cho đơn hàng #${bookingId}</p>
                    <p>Nếu không phải ông thực hiện, hãy bỏ qua mail này nha!</p>
                </div>`
        });
    },

    // Gửi Vé sau khi thanh toán (MoMo hoặc Bank đều dùng chung cái này)
    sendTicketEmail: async (customerEmail, ticketData) => {
        const {
            bookingId, customerName, seatLabel,
            movieTitle, cinemaName, startTime,
            selectedDate, selectedFoods, moviePoster, earnedPoints
        } = ticketData;

        // Xử lý ảnh Poster từ thư mục uploads
        const fileName = moviePoster ? path.basename(moviePoster) : null;
        const absolutePath = fileName
            ? path.join(__dirname, '..', 'uploads', 'posters', fileName)
            : null;

        const fileExists = absolutePath && fs.existsSync(absolutePath);

        const mailOptions = {
            from: '"Dũng Cinema 🍿" <nguyenphamquangdung9611@gmail.com>',
            to: customerEmail,
            subject: `[VÉ ĐIỆN TỬ] ${movieTitle?.toUpperCase()} - MÃ ĐƠN #${bookingId}`,
            html: `
                <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <div style="background: #e74c3c; padding: 25px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">THANH TOÁN THÀNH CÔNG!</h1>
                            <p style="margin-top: 5px; opacity: 0.9;">Hệ thống Dũng Cinema đã ghi nhận đơn hàng</p>
                        </div>
                        <div style="padding: 30px;">
                            <p>Chào <b>${customerName}</b>,</p>
                            <div style="border: 2px dashed #eee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <h3 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 20px;">${movieTitle}</h3>
                                <p style="margin: 5px 0;"><b>📍 Rạp:</b> ${cinemaName}</p>
                                <p style="margin: 5px 0;"><b>⏰ Suất:</b> ${startTime} | ${selectedDate}</p>
                                <p style="margin: 5px 0;"><b>💺 Ghế:</b> <span style="font-size: 18px; color: #e74c3c; font-weight:bold;">${seatLabel}</span></p>
                                <p style="margin: 5px 0;"><b>🍿 Đồ ăn:</b> ${selectedFoods || 'Không có'}</p>
                            </div>
                            ${fileExists ? `<div style="text-align: center; margin: 20px 0;"><img src="cid:poster_img" style="max-width: 200px; border-radius: 10px;" /></div>` : ''}
                            <div style="text-align: center; padding: 15px; background: #fff9f9; border-radius: 8px;">
                                <p style="color: #27ae60; font-weight: bold; margin: 0;">🌟 Bạn vừa tích lũy thêm: ${earnedPoints} điểm!</p>
                                <h2 style="margin: 10px 0 0 0; color: #333; font-size: 24px;">Mã vé: #${bookingId}</h2>
                            </div>
                        </div>
                    </div>
                </div>`,
            attachments: fileExists ? [{ filename: fileName, path: absolutePath, cid: 'poster_img' }] : []
        };

        return transporter.sendMail(mailOptions);
    }
};

module.exports = MailServiceTicket;
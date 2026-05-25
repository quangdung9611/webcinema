const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Bắt buộc dùng 465 + true cho Gmail
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Thêm dòng này để tăng thời gian chờ, tránh bị timeout ngay lập tức
    connectionTimeout: 10000, 
    greetingTimeout: 10000 
});

module.exports = transporter;
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // Đổi từ 465 sang 587
    secure: false, // Với port 587 thì secure phải là false
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Bỏ qua lỗi chứng chỉ nếu có
    },
    connectionTimeout: 15000, // Tăng lên 15 giây
    greetingTimeout: 15000
});

module.exports = transporter;
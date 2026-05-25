const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525, // Đổi sang 2525
    secure: false, 
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
    },
    // Thêm cấu hình bắt buộc này để không bị timeout
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = transporter;
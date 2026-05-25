const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587, // Sửa thành 587 theo đúng thông số Brevo cấp
    secure: false, // false cho port 587
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
    },
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = transporter;
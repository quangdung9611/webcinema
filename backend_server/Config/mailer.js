const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // Dùng cho port 587
    auth: {
        user: process.env.BREVO_USER, // Đã đổi lại thành BREVO_USER
        pass: process.env.BREVO_PASS  // Đã đổi lại thành BREVO_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// TEST SMTP
transporter.verify((err, success) => {
    if (err) {
        console.log('❌ BREVO SMTP ERROR:', err);
    } else {
        console.log('✅ BREVO SMTP READY');
    }
});

module.exports = transporter;
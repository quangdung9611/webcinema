const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525,
    secure: false,
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

// ✅ Thêm default from
const defaultFrom = {
    email: process.env.BREVO_FROM_EMAIL || 'no-reply@quangdungcinema.id.vn',
    name: process.env.BREVO_FROM_NAME || 'Dũng Cinema 🍿'
};

// ✅ Thêm function send mail
const sendMail = async (to, subject, html, from = null) => {
    try {
        const info = await transporter.sendMail({
            from: from || `"${defaultFrom.name}" <${defaultFrom.email}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Email sent to ${to}`);
        return info;
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error.message);
        throw error;
    }
};

module.exports = {
    transporter,
    sendMail,
    defaultFrom
};
const nodemailer = require('nodemailer');

console.log('📧 MAILER INIT STARTING...');

// =========================================================
// TRANSPORTER (GMAIL)
// =========================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // Gmail của bạn
        pass: process.env.EMAIL_PASS    // App Password (KHÔNG phải password thường)
    }
});

// =========================================================
// VERIFY CONNECTION
// =========================================================
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ MAILER ERROR:', error);
    } else {
        console.log('✅ MAILER READY TO SEND EMAILS');
    }
});

module.exports = transporter;
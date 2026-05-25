const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({

    service: 'gmail',

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },

    tls: {
        rejectUnauthorized: false
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
});

// TEST SMTP
transporter.verify((err, success) => {

    if (err) {
        console.log('❌ SMTP ERROR:', err);
    } else {
        console.log('✅ SMTP READY');
    }

});

module.exports = transporter;
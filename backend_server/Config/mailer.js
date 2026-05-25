const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({

    host: 'smtp-relay.brevo.com',

    port: 587,

    secure: false,

    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
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

        console.log('❌ BREVO SMTP ERROR:', err);

    } else {

        console.log('✅ BREVO SMTP READY');

    }

});

module.exports = transporter;
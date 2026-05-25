const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io', // Host của Mailtrap
    port: 2525,                      // Port của Mailtrap
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Với Mailtrap thì không cần secure: true
    connectionTimeout: 10000, 
    greetingTimeout: 10000 
});

module.exports = transporter;
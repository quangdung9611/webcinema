// =========================================================
// IMPORTS
// =========================================================

const nodemailer = require('nodemailer');

// =========================================================
// MAIL TRANSPORTER
// =========================================================

const transporter = nodemailer.createTransport({

    service: 'gmail',

   auth: {
        user: process.env.EMAIL_USER, // Lấy từ Render
        pass: process.env.EMAIL_PASS  // Lấy từ Render
    }

});

// =========================================================
// VERIFY CONNECTION
// =========================================================

transporter.verify((error) => {

    if (error) {

        console.log(

            '❌ Mailer Error:',

            error

        );

    }

    else {

        console.log(

            '✅ Mailer Connected'

        );

    }

});

// =========================================================
// EXPORT
// =========================================================

module.exports = transporter;
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
        user: 'nguyenphamquangdung9611@gmail.com', //
        pass: 'gezt gsvc gpdn rqfc' //
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
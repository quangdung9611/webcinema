const nodemailer = require('nodemailer');

console.log('📧 MAIL CONFIG:', {

    user: process.env.EMAIL_USER,

    passExists: !!process.env.EMAIL_PASS

});

const transporter = nodemailer.createTransport({

    host: 'smtp.gmail.com',

    port: 465,

    secure: true,

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    }

});

transporter.verify((error, success) => {

    if (error) {

        console.log('❌ MAILER ERROR');

        console.log(error);

    }
    else {

        console.log('✅ MAILER CONNECTED');

    }

});

module.exports = transporter;
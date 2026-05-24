const nodemailer = require('nodemailer');

console.log('📧 START MAILER');

console.log({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS_EXISTS: !!process.env.EMAIL_PASS
});

const transporter = nodemailer.createTransport({

    host: 'smtp.gmail.com',

    port: 465,

    secure: true,

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    },

    tls: {
        rejectUnauthorized: false
    }

});

(async () => {

    try {

        await transporter.verify();

        console.log('✅ MAILER CONNECTED');

    }
    catch (err) {

        console.log('❌ MAILER VERIFY ERROR');

        console.log(err);

    }

})();

module.exports = transporter;
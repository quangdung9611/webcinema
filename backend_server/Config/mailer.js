// Config/mailer.js
const nodemailer = require('nodemailer');

/*=========================================================
    ✅ VALIDATE ENV NGAY KHI KHỞI ĐỘNG
=========================================================*/
const REQUIRED_ENV = ['BREVO_USER', 'BREVO_PASS'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);

if (missing.length > 0) {
    console.error(`❌ [MAILER] Thiếu biến môi trường: ${missing.join(", ")}`);
    console.error(`   └─ Kiểm tra file .env (BREVO_USER và BREVO_PASS là SMTP key, KHÔNG phải API key)`);
}

/*=========================================================
    ✅ TRANSPORTER
=========================================================*/
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525,                       // Brevo khuyến nghị: 2525 hoặc 587
    secure: false,                    // 2525/587 dùng STARTTLS
    auth: {
        user: process.env.BREVO_USER, // ⚠️ SMTP login (thường là email đăng ký Brevo)
        pass: process.env.BREVO_PASS, // ⚠️ SMTP key (không phải API key)
    },
    pool: true,                       // ✅ dùng pool để tái sử dụng connection
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
        rejectUnauthorized: false     // giữ như bạn đang để, nhưng nên bật true nếu server hỗ trợ
    },
    // ✅ Bật log khi dev để thấy chi tiết SMTP handshake
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
});

/*=========================================================
    ✅ DEFAULT FROM
=========================================================*/
const defaultFrom = {
    email: process.env.BREVO_FROM_EMAIL || 'no-reply@quangdungcinema.id.vn',
    name: process.env.BREVO_FROM_NAME || 'Dũng Cinema 🍿'
};

/*=========================================================
    ✅ VERIFY SMTP KHI KHỞI ĐỘNG
    → Biết ngay mail có gửi được không, khỏi mò
=========================================================*/
transporter.verify((err, success) => {
    if (err) {
        console.error('❌ [MAILER] SMTP verify FAILED:', err.message);
        console.error('   └─ Checklist:');
        console.error('      1. BREVO_USER = email đăng nhập Brevo');
        console.error('      2. BREVO_PASS = SMTP key (KHÔNG phải API key)');
        console.error('      3. BREVO_FROM_EMAIL phải là domain đã verify trong Brevo');
        console.error('      4. Kiểm tra network/firewall có chặn port 2525 không');
    } else {
        console.log('✅ [MAILER] SMTP ready — sẵn sàng gửi mail qua Brevo');
    }
});

/*=========================================================
    ✅ SEND MAIL (wrapper có log + error rõ ràng)
=========================================================*/
const sendMail = async (to, subject, html, from = null) => {
    if (!to) throw new Error('sendMail: thiếu người nhận (to)');

    const fromStr = from || `"${defaultFrom.name}" <${defaultFrom.email}>`;

    try {
        const info = await transporter.sendMail({
            from: fromStr,
            to,
            subject,
            html,
        });

        console.log(`✅ [MAILER] Email sent → ${to} | msgId=${info.messageId}`);
        return info;

    } catch (error) {
        console.error(`❌ [MAILER] Email FAILED → ${to}`);
        console.error(`   ├─ Code: ${error.code || 'N/A'}`);
        console.error(`   ├─ Response: ${error.response || 'N/A'}`);
        console.error(`   └─ Message: ${error.message}`);

        // ✅ Log rõ các lỗi Brevo thường gặp
        if (error.response?.includes('Unauthorized') || error.code === 'EAUTH') {
            console.error('   🔑 → Sai BREVO_USER hoặc BREVO_PASS (dùng SMTP key, không phải API key)');
        }
        if (error.response?.includes('sender') || error.response?.includes('from')) {
            console.error('   📧 → BREVO_FROM_EMAIL chưa verify domain trong Brevo');
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
            console.error('   🌐 → Không kết nối được smtp-relay.brevo.com:2525 (firewall/network)');
        }
        if (error.response?.includes('quota') || error.response?.includes('limit')) {
            console.error('   📊 → Hết quota Brevo (300 mail/ngày free tier)');
        }

        throw error;
    }
};

module.exports = {
    transporter,
    sendMail,
    defaultFrom,
};
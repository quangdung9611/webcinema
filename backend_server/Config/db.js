
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 26990,

    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,

    // FIX LỆCH 7 TIẾNG
    timezone: '+07:00',

    // Trả datetime dạng string tránh auto convert timezone
    dateStrings: true,

    // Keep alive ổn định cho Render
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    connectTimeout: 10000,

    ssl: {
        rejectUnauthorized: false
    }
});

// Force timezone Việt Nam cho từng connection
pool.getConnection()
    .then(async (conn) => {

        await conn.query(
            "SET time_zone = '+07:00'"
        );

        console.log(
            '🇻🇳 MySQL timezone: Asia/Ho_Chi_Minh (+07:00)'
        );

        conn.release();

    })
    .catch((err) => {

        console.error(
            '❌ Timezone setup error:',
            err.message
        );

    });

pool.on('error', (err) => {

    console.error(
        '❌ [Database Error]:',
        err.message
    );

    if (
        err.code ===
        'PROTOCOL_CONNECTION_LOST'
    ) {

        console.log(
            '🔄 Đang thử reconnect database...'
        );

    }
});

module.exports = pool;


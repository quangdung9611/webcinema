const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 26990,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Đồng bộ giờ Việt Nam
    timezone: '+07:00',

    // Tránh JS tự convert Date
    dateStrings: true,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    connectTimeout: 10000,

    ssl: {
        rejectUnauthorized: false
    }
});

// TEST kết nối + set timezone
(async () => {
    try {

        const conn =
            await pool.getConnection();

        await conn.query(
            "SET time_zone = '+07:00'"
        );

        console.log(
            '🇻🇳 MySQL timezone: +07:00'
        );

        conn.release();

    } catch (err) {

        console.error(
            'Timezone setup error:',
            err.message
        );

    }
})();

pool.on('error', (err) => {

    console.error(
        '[Database Error]:',
        err.message
    );

    if (
        err.code ===
        'PROTOCOL_CONNECTION_LOST'
    ) {

        console.log(
            'Đang reconnect database...'
        );

    }

});

module.exports = pool;
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

    // FIX GIỜ VIỆT NAM
    timezone: '+07:00',

    // Trả về string tránh lỗi convert JS Date
    dateStrings: true,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    connectTimeout: 10000,

    ssl: {
        rejectUnauthorized: false
    }
});

// Set timezone cho từng connection MySQL
pool.getConnection()
    .then(async (conn) => {

        await conn.query(
            "SET time_zone = '+07:00'"
        );

        console.log(
            '🇻🇳 MySQL timezone set to Vietnam (+07:00)'
        );

        conn.release();

    })
    .catch((err) => {

        console.error(
            'Timezone setup error:',
            err.message
        );

    });

pool.on('error', (err) => {

    console.error(
        '[Database Error]:',
        err.message
    );

});

module.exports = pool;
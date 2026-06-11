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

    // FIX TIMEZONE VN
    timezone: 'Z',

    dateStrings: true,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    ssl: {
        rejectUnauthorized: false
    }
});

// Chạy timezone cho mọi connection
pool.on('connection', async (connection) => {
    try {

        await connection.query(
            "SET time_zone = '+07:00'"
        );

        console.log(
            '🇻🇳 Connection timezone: +07:00'
        );

    } catch (err) {

        console.error(
            'Timezone Error:',
            err.message
        );

    }
});

module.exports = pool;
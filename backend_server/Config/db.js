const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    // Đổi 'localhost' thành '127.0.0.1' để bỏ qua bước dịch tên miền cho nhanh
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 26990,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00', 
    dateStrings: true,
    
    // Thêm dòng này để kết nối bền bỉ hơn
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    // ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT:
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;
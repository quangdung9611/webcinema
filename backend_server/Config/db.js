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
    
    // 1. Giúp Node.js hiểu múi giờ khi gửi/nhận dữ liệu
    timezone: '+00:00', 
    dateStrings: true,
    
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000, 
    acquireTimeout: 10000, 
    
    ssl: {
        rejectUnauthorized: false 
    }
});

// 2. ĐOẠN QUAN TRỌNG NHẤT: Ép MySQL Server dùng giờ VN ngay khi vừa kết nối
// Ép MySQL Server dùng giờ VN ngay khi vừa kết nối
pool.on('connection', async (connection) => {
    try {
        await connection.query("SET time_zone = '+07:00'");
        console.log('🕒 Database đã đồng bộ múi giờ Việt Nam (+07:00)');
    } catch (err) {
        console.error('❌ Lỗi SET time_zone:', err.message);
    }
});

pool.on('error', (err) => {
    console.error('🔥 [Database Error]:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('📡 Đang nỗ lực kết nối lại...');
    }
});

module.exports = pool;
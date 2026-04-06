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
    
    // --- ĐOẠN NÀY LÀ CHÌA KHÓA ---
    timezone: '+00:00', // Không cho Node.js tự ý cộng/trừ giờ
    dateStrings: true,  // Lấy dữ liệu dạng CHUỖI, có sao bê vậy
    // ----------------------------
    
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000, 
    acquireTimeout: 10000, 
    
    ssl: {
        rejectUnauthorized: false 
    }
});

// XÓA BỎ ĐOẠN pool.on('connection') cũ đi
// Vì mình dùng DATETIME nên không cần ép MySQL SET time_zone nữa.
// Cứ để nó mặc định là nó sẽ lưu đúng cái chuỗi ông gửi vào.

pool.on('error', (err) => {
    console.error('🔥 [Database Error]:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('📡 Đang nỗ lực kết nối lại...');
    }
});

module.exports = pool;
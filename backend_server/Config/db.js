const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 26990,

    waitForConnections: true,
    connectionLimit: 5, // Hạ xuống 5 để nhẹ cho Render bản Free
    queueLimit: 0,
    timezone: '+07:00', 
    dateStrings: true,
    
    // --- CẤU HÌNH "BẤT TỬ" CHO RENDER & AIVEN ---
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    // Khống chế thời gian chờ, không cho web "quay vòng vòng" quá lâu
    connectTimeout: 10000, // Đợi tối đa 10s để kết nối
    acquireTimeout: 10000, // Đợi tối đa 10s để lấy kết nối từ pool
    
    ssl: {
        rejectUnauthorized: false // Bắt buộc để Aiven không chặn
    }
});

// Thêm đoạn check lỗi này để App không bị văng (Crash) khi DB mất kết nối
pool.on('error', (err) => {
    console.error('🔥 [Database Error]: Kết nối bị ngắt đột ngột!', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('📡 Đang nỗ lực kết nối lại...');
    }
});

module.exports = pool;